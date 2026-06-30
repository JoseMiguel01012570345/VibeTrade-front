import type { Browser, BrowserContext, Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  openChatThread,
  openOfferAndComprar,
  openRailContracts,
  waitForChatThread,
} from "./chat-helpers";
import { dismissPeerPartyExitModalIfOpen } from "./route-sheet-ui-helpers";

export const SELLER_TRUST_PENALTY_PTS = 3;

export async function injectE2ESession(
  target: Page | BrowserContext,
  token: string,
): Promise<void> {
  await target.addInitScript((t: string) => {
    sessionStorage.setItem("vt_session_active", "1");
    sessionStorage.setItem("vt_session_token", t);
  }, token);
}

async function fillMerchandiseBuyerFields(
  page: Page,
  lineIndex: number,
  opts: { cantidad?: string } = {},
) {
  const fill = async (field: string, value: string) => {
    const input = page.locator(`#agr-m-${lineIndex}-${field}`);
    if (await input.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await input.fill(value);
    }
  };
  await fill("cantidad", opts.cantidad ?? "1");
  await fill("tipoEmbalaje", "caja");
  await fill("devolucionQuienPaga", "comprador");
  await fill("devolucionPlazos", "30 dias");
  await fill("regulaciones", "Cumplimiento normativo E2E");
}

async function selectCatalogService(
  page: Page,
  wizard: Locator,
  serviceNamePart: string,
): Promise<void> {
  const trigger = wizard.getByRole("button", {
    name: /servicio de la ficha de la tienda/i,
  });
  await expect(trigger).toBeEnabled({ timeout: 20_000 });
  const current = ((await trigger.textContent()) ?? "").trim();
  if (
    new RegExp(serviceNamePart, "i").test(current) &&
    !/elige un servicio/i.test(current)
  ) {
    return;
  }

  await trigger.click();
  const option = page
    .getByRole("option")
    .filter({ hasText: new RegExp(serviceNamePart, "i") })
    .first();
  await expect(option).toBeVisible({ timeout: 15_000 });
  await option.click();
  await expect(trigger).toContainText(new RegExp(serviceNamePart, "i"), {
    timeout: 10_000,
  });
  await expect(trigger).not.toContainText(/elige un servicio/i);
}

async function selectCatalogProduct(
  page: Page,
  lineIndex: number,
  productLabelIncludes: string,
) {
  const dialog = page.getByRole("dialog").filter({
    hasText: /emitir acuerdo|editar acuerdo/i,
  });
  const trigger = dialog
    .getByRole("button", { name: /producto de la ficha de la tienda/i })
    .nth(lineIndex);
  await expect(trigger).toBeEnabled({ timeout: 20_000 });
  await trigger.click();
  const option = page
    .getByRole("option")
    .filter({ hasText: new RegExp(productLabelIncludes, "i") })
    .first();
  await expect(option).toBeVisible({ timeout: 10_000 });
  await option.click();
}

export async function sellerEmitMerchandiseAgreement(
  page: Page,
  opts: {
    title: string;
    /** Texto del producto de ficha a enlazar en la línea 1 (p. ej. "Producto E2E"). */
    productNamePart?: string;
    /** Segunda línea enlazada a otro productId (nombre parcial). */
    secondProductNamePart?: string;
  },
): Promise<void> {
  await page.getByRole("button", { name: /emitir acuerdo/i }).click();
  const dialog = page.getByRole("dialog").filter({
    hasText: /emitir acuerdo de compra/i,
  });
  await expect(dialog).toBeVisible({ timeout: 15_000 });

  await dialog.locator("#agr-title").fill(opts.title);

  const merchRadio = dialog.getByRole("radio", { name: /incluir mercancías/i });
  if (!(await merchRadio.isChecked())) {
    await merchRadio.check();
  }
  await expect(
    dialog.getByRole("button", { name: /producto de la ficha de la tienda/i }).first(),
  ).toBeEnabled({ timeout: 20_000 });

  const productNeedle = opts.productNamePart ?? "Producto E2E";
  await selectCatalogProduct(page, 0, productNeedle);
  await fillMerchandiseBuyerFields(page, 0);

  if (opts.secondProductNamePart) {
    await dialog.getByRole("button", { name: /añadir tipo de mercancía/i }).click();
    await selectCatalogProduct(page, 1, opts.secondProductNamePart);
    await fillMerchandiseBuyerFields(page, 1);
  }

  const emitBtn = dialog.getByRole("button", { name: /^emitir acuerdo$/i });
  await expect(emitBtn).toBeEnabled({ timeout: 20_000 });
  const emitResponse = page.waitForResponse(
    (res) =>
      res.request().method() === "POST" &&
      /\/trade-agreements(?:\?|$)/.test(res.url()),
    { timeout: 45_000 },
  );
  await emitBtn.click();
  const res = await emitResponse.catch(() => null);
  if (res && res.status() >= 400) {
    const body = await res.text().catch(() => "");
    throw new Error(`emitTradeAgreement failed (${res.status()}): ${body}`);
  }
  await expect(dialog).toBeHidden({ timeout: 45_000 });

  await expect(page.getByText(opts.title).first()).toBeVisible({
    timeout: 25_000,
  });
}

export async function sellerEmitMerchandiseDualCurrencyAgreement(
  page: Page,
  opts: {
    title: string;
    usdProductNamePart: string;
    eurProductNamePart: string;
    usdQty?: string;
    eurQty?: string;
  },
): Promise<void> {
  await page.getByRole("button", { name: /emitir acuerdo/i }).click();
  const dialog = page.getByRole("dialog").filter({
    hasText: /emitir acuerdo de compra/i,
  });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.locator("#agr-title").fill(opts.title);
  await dialog.getByRole("radio", { name: /incluir mercancías/i }).check();
  await expect(
    dialog.getByRole("button", { name: /producto de la ficha de la tienda/i }).first(),
  ).toBeEnabled({ timeout: 20_000 });

  await selectCatalogProduct(page, 0, opts.usdProductNamePart);
  await fillMerchandiseBuyerFields(page, 0, {
    cantidad: opts.usdQty ?? "1",
  });

  await dialog.getByRole("button", { name: /añadir tipo de mercancía/i }).click();
  await selectCatalogProduct(page, 1, opts.eurProductNamePart);
  await fillMerchandiseBuyerFields(page, 1, {
    cantidad: opts.eurQty ?? "2",
  });

  await dialog.getByRole("button", { name: /^emitir acuerdo$/i }).click();
  await expect(page.getByText(opts.title).first()).toBeVisible({
    timeout: 25_000,
  });
}

const CALENDAR_MONTH_LABELS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

function currentCalendarMonthLabel(): string {
  return CALENDAR_MONTH_LABELS[new Date().getMonth()] ?? "May";
}

async function pickVtDateToday(page: Page, fieldLabel: string | RegExp): Promise<void> {
  await page.getByLabel(fieldLabel).click();
  const cal = page.getByRole("dialog", { name: "Calendario" });
  await expect(cal).toBeVisible({ timeout: 5_000 });
  const day = String(new Date().getDate());
  const dayBtn = cal
    .locator(".grid-cols-7 button:not([disabled])")
    .filter({ hasText: new RegExp(`^${day}$`) })
    .first();
  await dayBtn.evaluate((el) => (el as HTMLButtonElement).click());
  await expect(cal).toBeHidden({ timeout: 5_000 });
}

function modalByTitle(page: Page, title: string | RegExp): Locator {
  return page
    .locator(".vt-modal-backdrop")
    .filter({ has: page.locator(".vt-modal-title", { hasText: title }) })
    .last();
}

async function fillServiceVigencia(page: Page, wizard: Locator): Promise<void> {
  await wizard.getByRole("button", { name: /definir fechas/i }).click();
  const timeDialog = modalByTitle(page, /^tiempo del servicio$/i);
  await expect(timeDialog).toBeVisible({ timeout: 10_000 });
  await pickVtDateToday(page, /fecha de inicio del servicio/i);
  await timeDialog.getByRole("button", { name: /^guardar$/i }).click();
  await expect(timeDialog).toBeHidden({ timeout: 10_000 });
}

async function pickVtDateEndOfYear(
  page: Page,
  fieldLabel: string | RegExp,
): Promise<void> {
  await page.getByLabel(fieldLabel).click();
  const cal = page.getByRole("dialog", { name: "Calendario" });
  await expect(cal).toBeVisible({ timeout: 5_000 });
  await cal.getByLabel("Elegir mes").selectOption("12");
  const day31 = cal
    .locator(".grid-cols-7 button:not([disabled])")
    .filter({ hasText: /^31$/ })
    .last();
  await day31.evaluate((el) => (el as HTMLButtonElement).click());
  await expect(cal).toBeHidden({ timeout: 5_000 });
}

async function fillServiceVigenciaThroughYearEnd(
  page: Page,
  wizard: Locator,
): Promise<void> {
  await wizard.getByRole("button", { name: /definir fechas/i }).click();
  const timeDialog = modalByTitle(page, /^tiempo del servicio$/i);
  await expect(timeDialog).toBeVisible({ timeout: 10_000 });
  await pickVtDateToday(page, /fecha de inicio del servicio/i);
  await pickVtDateEndOfYear(page, /fecha de fin del servicio/i);
  await timeDialog.getByRole("button", { name: /^guardar$/i }).click();
  await expect(timeDialog).toBeHidden({ timeout: 10_000 });
}

async function enabledMonthLabelsInScheduleModal(
  sched: Locator,
  minCount = 2,
): Promise<string[]> {
  const enabled: string[] = [];
  for (const label of CALENDAR_MONTH_LABELS) {
    const btn = sched.getByRole("button", {
      name: new RegExp(`^${label}$`, "i"),
    });
    const visible = await btn.isVisible({ timeout: 300 }).catch(() => false);
    if (!visible) continue;
    if (await btn.isEnabled().catch(() => false)) {
      enabled.push(label);
    }
    if (enabled.length >= minCount) break;
  }
  if (enabled.length < minCount) {
    throw new Error(
      `Need ${minCount} enabled schedule months, found ${enabled.length}: ${enabled.join(", ")}`,
    );
  }
  return enabled;
}

async function fillServiceSchedule(
  page: Page,
  wizard: Locator,
  monthLabels: string[] = [currentCalendarMonthLabel()],
): Promise<void> {
  await wizard.getByRole("button", { name: /configurar horarios y fechas/i }).click();
  const sched = modalByTitle(page, /^horarios y fechas del servicio$/i);
  await expect(sched).toBeVisible({ timeout: 10_000 });
  for (const month of monthLabels) {
    const btn = sched.getByRole("button", {
      name: new RegExp(`^${month}$`, "i"),
    });
    await expect(btn).toBeEnabled({ timeout: 10_000 });
    await btn.click();
  }
  await sched.getByRole("button", { name: /^siguiente$/i }).click();
  await sched.getByRole("button", { name: /^siguiente$/i }).click();
  await sched.getByRole("button", { name: /guardar horarios/i }).click();
  await expect(sched).toBeHidden({ timeout: 15_000 });
}

async function fillServiceScheduleFirstEnabledMonths(
  page: Page,
  wizard: Locator,
  count = 2,
): Promise<string[]> {
  await wizard.getByRole("button", { name: /configurar horarios y fechas/i }).click();
  const sched = modalByTitle(page, /^horarios y fechas del servicio$/i);
  await expect(sched).toBeVisible({ timeout: 10_000 });
  const months = await enabledMonthLabelsInScheduleModal(sched, count);
  for (const month of months) {
    await sched
      .getByRole("button", { name: new RegExp(`^${month}$`, "i") })
      .click();
  }
  await sched.getByRole("button", { name: /^siguiente$/i }).click();
  await sched.getByRole("button", { name: /^siguiente$/i }).click();
  await sched.getByRole("button", { name: /guardar horarios/i }).click();
  await expect(sched).toBeHidden({ timeout: 15_000 });
  return months;
}

async function pickRecurrenceMoneda(
  page: Page,
  payModal: Locator,
  rowIndex: number,
  currency: "USD" | "EUR",
): Promise<void> {
  const monedaBtn = payModal
    .getByRole("button", { name: /moneda del pago/i })
    .nth(rowIndex);
  await monedaBtn.click();
  await page.getByRole("option", { name: currency }).click();
}

async function pickRecurrenceRowMonth(
  page: Page,
  payModal: Locator,
  rowIndex: number,
  monthLabel: string,
): Promise<void> {
  const mesBtn = payModal
    .getByRole("button", { name: /mes de pago/i })
    .nth(rowIndex);
  await mesBtn.click();
  await page
    .getByRole("option", { name: new RegExp(`^${monthLabel}$`, "i") })
    .click();
}

async function fillSingleCurrencyTwoRecurrenceServicePayments(
  page: Page,
  wizard: Locator,
): Promise<void> {
  await wizard.getByRole("button", { name: /configurar recurrencia de pagos/i }).click();
  const pay = modalByTitle(page, /^recurrencia de pagos$/i);
  await expect(pay).toBeVisible({ timeout: 10_000 });

  const months = await enabledMonthLabelsInScheduleModal(pay, 2);

  let amounts = pay.locator('input[inputmode="decimal"]');
  while ((await amounts.count()) < 2) {
    await pay.getByRole("button", { name: /\+ añadir pago/i }).click();
    amounts = pay.locator('input[inputmode="decimal"]');
  }

  await pickRecurrenceRowMonth(page, pay, 0, months[0]!);
  await pickRecurrenceRowMonth(page, pay, 1, months[1]!);

  await amounts.nth(0).fill("10");
  await amounts.nth(1).fill("25");
  await pickRecurrenceMoneda(page, pay, 0, "USD");
  await pickRecurrenceMoneda(page, pay, 1, "USD");

  await pay.getByRole("button", { name: /^guardar$/i }).click();
  await expect(pay).toBeHidden({ timeout: 15_000 });
}

async function fillDualCurrencyServicePayments(
  page: Page,
  wizard: Locator,
): Promise<void> {
  await wizard.getByRole("button", { name: /configurar recurrencia de pagos/i }).click();
  const pay = modalByTitle(page, /^recurrencia de pagos$/i);
  await expect(pay).toBeVisible({ timeout: 10_000 });

  const months = await enabledMonthLabelsInScheduleModal(pay, 2);

  let amounts = pay.locator('input[inputmode="decimal"]');
  while ((await amounts.count()) < 2) {
    await pay.getByRole("button", { name: /\+ añadir pago/i }).click();
    amounts = pay.locator('input[inputmode="decimal"]');
  }

  await pickRecurrenceRowMonth(page, pay, 0, months[0]!);
  await pickRecurrenceRowMonth(page, pay, 1, months[1]!);

  await amounts.nth(0).fill("10");
  await amounts.nth(1).fill("25");
  await pickRecurrenceMoneda(page, pay, 0, "USD");
  await pickRecurrenceMoneda(page, pay, 1, "EUR");

  await pay.getByRole("button", { name: /^guardar$/i }).click();
  await expect(pay).toBeHidden({ timeout: 15_000 });
}

async function fillServicePayments(page: Page, wizard: Locator): Promise<void> {
  const month = currentCalendarMonthLabel();
  await wizard.getByRole("button", { name: /configurar recurrencia de pagos/i }).click();
  const pay = modalByTitle(page, /^recurrencia de pagos$/i);
  await expect(pay).toBeVisible({ timeout: 10_000 });
  const monthToggle = pay.getByRole("button", { name: new RegExp(`^${month}$`, "i") });
  if (await monthToggle.isVisible().catch(() => false)) {
    await monthToggle.click();
  }
  const amount = pay.locator('input[inputmode="decimal"]').first();
  if (await amount.isVisible().catch(() => false)) {
    await amount.fill("100");
  }
  await pay.getByRole("button", { name: /^guardar$/i }).click();
  await expect(pay).toBeHidden({ timeout: 15_000 });
}

export async function sellerEmitServiceAgreement(
  page: Page,
  opts: { title: string; serviceNamePart: string },
): Promise<void> {
  await page.getByRole("button", { name: /emitir acuerdo/i }).click();
  const agreementDialog = page.getByRole("dialog").filter({
    hasText: /emitir acuerdo de compra/i,
  });
  await expect(agreementDialog).toBeVisible({ timeout: 15_000 });

  await agreementDialog.locator("#agr-title").fill(opts.title);
  await agreementDialog.getByRole("radio", { name: /incluir servicios/i }).check();

  // «Añadir servicio» abre el asistente de configuración automáticamente.
  await agreementDialog.getByRole("button", { name: /añadir servicio/i }).click();

  await completeServiceConfigWizard(page, opts.serviceNamePart);

  await agreementDialog.getByRole("button", { name: /^emitir acuerdo$/i }).click();

  await expect(page.getByText(opts.title).first()).toBeVisible({
    timeout: 25_000,
  });
}

async function completeServiceConfigWizard(
  page: Page,
  serviceNamePart: string,
): Promise<void> {
  const wizard = modalByTitle(page, /^configurar servicio$/i);
  await expect(wizard).toBeVisible({ timeout: 15_000 });

  if (
    await wizard
      .getByRole("button", { name: /servicio de la ficha de la tienda/i })
      .isVisible()
      .catch(() => false)
  ) {
    await selectCatalogService(page, wizard, serviceNamePart);
  } else {
    const tipo = wizard.locator("#wiz-sv-tipo");
    if (await tipo.isVisible().catch(() => false)) {
      await tipo.fill(serviceNamePart);
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    await wizard.getByRole("button", { name: /^siguiente$/i }).click();
    if (
      await wizard
        .getByRole("button", { name: /definir fechas/i })
        .isVisible()
        .catch(() => false)
    ) {
      break;
    }
    await selectCatalogService(page, wizard, serviceNamePart);
  }
  await expect(
    wizard.getByRole("button", { name: /definir fechas/i }),
  ).toBeVisible({ timeout: 20_000 });

  await fillServiceVigencia(page, wizard);
  await wizard.getByRole("button", { name: /^siguiente$/i }).click();

  await fillServiceSchedule(page, wizard);
  await wizard.getByRole("button", { name: /^siguiente$/i }).click();

  await fillServicePayments(page, wizard);
  await wizard.getByRole("button", { name: /^siguiente$/i }).click();

  for (let step = 4; step <= 6; step++) {
    await wizard.getByRole("button", { name: /^siguiente$/i }).click();
  }

  await wizard.locator("#wiz-med").fill("Entregables aprobados E2E");
  await wizard.locator("#wiz-peninc").fill("Penalización por incumplimiento E2E");
  await wizard.locator("#wiz-nivel").fill("Responsabilidad limitada al monto E2E");

  await wizard.getByRole("button", { name: /guardar configuración/i }).click();
  await expect(wizard).toBeHidden({ timeout: 20_000 });
}

async function completeSingleCurrencyTwoRecurrenceServiceConfigWizard(
  page: Page,
  serviceNamePart: string,
): Promise<void> {
  const wizard = modalByTitle(page, /^configurar servicio$/i);
  await expect(wizard).toBeVisible({ timeout: 15_000 });

  if (
    await wizard
      .getByRole("button", { name: /servicio de la ficha de la tienda/i })
      .isVisible()
      .catch(() => false)
  ) {
    await selectCatalogService(page, wizard, serviceNamePart);
  } else {
    const tipo = wizard.locator("#wiz-sv-tipo");
    if (await tipo.isVisible().catch(() => false)) {
      await tipo.fill(serviceNamePart);
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    await wizard.getByRole("button", { name: /^siguiente$/i }).click();
    if (
      await wizard
        .getByRole("button", { name: /definir fechas/i })
        .isVisible()
        .catch(() => false)
    ) {
      break;
    }
    await selectCatalogService(page, wizard, serviceNamePart);
  }
  await expect(
    wizard.getByRole("button", { name: /definir fechas/i }),
  ).toBeVisible({ timeout: 20_000 });

  await fillServiceVigenciaThroughYearEnd(page, wizard);
  await wizard.getByRole("button", { name: /^siguiente$/i }).click();

  await fillServiceScheduleFirstEnabledMonths(page, wizard, 2);
  await wizard.getByRole("button", { name: /^siguiente$/i }).click();

  await fillSingleCurrencyTwoRecurrenceServicePayments(page, wizard);
  await wizard.getByRole("button", { name: /^siguiente$/i }).click();

  for (let step = 4; step <= 6; step++) {
    await wizard.getByRole("button", { name: /^siguiente$/i }).click();
  }

  await wizard.locator("#wiz-med").fill("Entregables aprobados E2E");
  await wizard.locator("#wiz-peninc").fill("Penalización por incumplimiento E2E");
  await wizard.locator("#wiz-nivel").fill("Responsabilidad limitada al monto E2E");

  await wizard.getByRole("button", { name: /guardar configuración/i }).click();
  await expect(wizard).toBeHidden({ timeout: 20_000 });
}

async function completeDualCurrencyServiceConfigWizard(
  page: Page,
  serviceNamePart: string,
  opts: { catalogLinked?: boolean } = {},
): Promise<void> {
  const catalogLinked = opts.catalogLinked !== false;
  const wizard = modalByTitle(page, /^configurar servicio$/i);
  await expect(wizard).toBeVisible({ timeout: 15_000 });

  if (catalogLinked) {
    if (
      await wizard
        .getByRole("button", { name: /servicio de la ficha de la tienda/i })
        .isVisible()
        .catch(() => false)
    ) {
      await selectCatalogService(page, wizard, serviceNamePart);
    } else {
      const tipo = wizard.locator("#wiz-sv-tipo");
      if (await tipo.isVisible().catch(() => false)) {
        await tipo.fill(serviceNamePart);
      }
    }
  } else {
    const tipo = wizard.locator("#wiz-sv-tipo");
    await expect(tipo).toBeVisible({ timeout: 10_000 });
    await tipo.fill(serviceNamePart);
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    await wizard.getByRole("button", { name: /^siguiente$/i }).click();
    if (
      await wizard
        .getByRole("button", { name: /definir fechas/i })
        .isVisible()
        .catch(() => false)
    ) {
      break;
    }
    if (catalogLinked) {
      await selectCatalogService(page, wizard, serviceNamePart);
    }
  }
  await expect(
    wizard.getByRole("button", { name: /definir fechas/i }),
  ).toBeVisible({ timeout: 20_000 });

  await fillServiceVigenciaThroughYearEnd(page, wizard);
  await wizard.getByRole("button", { name: /^siguiente$/i }).click();

  await fillServiceScheduleFirstEnabledMonths(page, wizard, 2);
  await wizard.getByRole("button", { name: /^siguiente$/i }).click();

  await fillDualCurrencyServicePayments(page, wizard);
  await wizard.getByRole("button", { name: /^siguiente$/i }).click();

  for (let step = 4; step <= 6; step++) {
    await wizard.getByRole("button", { name: /^siguiente$/i }).click();
  }

  await wizard.locator("#wiz-med").fill("Entregables aprobados E2E");
  await wizard.locator("#wiz-peninc").fill("Penalización por incumplimiento E2E");
  await wizard.locator("#wiz-nivel").fill("Responsabilidad limitada al monto E2E");

  await wizard.getByRole("button", { name: /guardar configuración/i }).click();
  await expect(wizard).toBeHidden({ timeout: 20_000 });
}

export async function sellerEmitSingleCurrencyTwoRecurrenceServiceAgreement(
  page: Page,
  opts: { title: string; serviceNamePart: string },
): Promise<void> {
  await page.getByRole("button", { name: /emitir acuerdo/i }).click();
  const agreementDialog = page.getByRole("dialog").filter({
    hasText: /emitir acuerdo de compra/i,
  });
  await expect(agreementDialog).toBeVisible({ timeout: 15_000 });

  await agreementDialog.locator("#agr-title").fill(opts.title);
  await agreementDialog.getByRole("radio", { name: /incluir servicios/i }).check();
  await agreementDialog.getByRole("button", { name: /añadir servicio/i }).click();

  await completeSingleCurrencyTwoRecurrenceServiceConfigWizard(page, opts.serviceNamePart);

  await agreementDialog.getByRole("button", { name: /^emitir acuerdo$/i }).click();

  await expect(page.getByText(opts.title).first()).toBeVisible({
    timeout: 25_000,
  });
}

/** Configura cuotas USD+EUR y verifica que emitir queda bloqueado por moneda única. */
export async function sellerAttemptEmitDualCurrencyServiceAgreementRejected(
  page: Page,
  opts: {
    title: string;
    serviceNamePart: string;
    /** Sin ficha: permite USD+EUR en recurrencia (moneda base del asistente). */
    catalogLinked?: boolean;
  },
): Promise<void> {
  await page.getByRole("button", { name: /emitir acuerdo/i }).click();
  const agreementDialog = page.getByRole("dialog").filter({
    hasText: /emitir acuerdo de compra/i,
  });
  await expect(agreementDialog).toBeVisible({ timeout: 15_000 });

  await agreementDialog.locator("#agr-title").fill(opts.title);
  await agreementDialog.getByRole("radio", { name: /incluir servicios/i }).check();
  await agreementDialog.getByRole("button", { name: /añadir servicio/i }).click();

  await completeDualCurrencyServiceConfigWizard(page, opts.serviceNamePart, {
    catalogLinked: opts.catalogLinked,
  });

  await agreementDialog.getByRole("button", { name: /^emitir acuerdo$/i }).click();

  await expect(
    agreementDialog.getByText(/una sola moneda/i),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(opts.title).first()).toBeHidden({ timeout: 5_000 });
}

/** Dos líneas USD+EUR: emitir debe quedar bloqueado. */
export async function sellerAttemptEmitMerchandiseDualCurrencyAgreementRejected(
  page: Page,
  opts: {
    title: string;
    usdProductNamePart: string;
    eurProductNamePart: string;
  },
): Promise<void> {
  await page.getByRole("button", { name: /emitir acuerdo/i }).click();
  const dialog = page.getByRole("dialog").filter({
    hasText: /emitir acuerdo de compra/i,
  });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.locator("#agr-title").fill(opts.title);
  await dialog.getByRole("radio", { name: /incluir mercancías/i }).check();
  await expect(
    dialog.getByRole("button", { name: /producto de la ficha de la tienda/i }).first(),
  ).toBeEnabled({ timeout: 20_000 });

  await selectCatalogProduct(page, 0, opts.usdProductNamePart);
  await fillMerchandiseBuyerFields(page, 0);

  await dialog.getByRole("button", { name: /añadir tipo de mercancía/i }).click();
  await selectCatalogProduct(page, 1, opts.eurProductNamePart);
  await fillMerchandiseBuyerFields(page, 1);

  await dialog.getByRole("button", { name: /^emitir acuerdo$/i }).click();

  await expect(dialog.getByText(/una sola moneda/i)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(opts.title).first()).toBeHidden({ timeout: 5_000 });
}

export async function sellerEmitDualCurrencyServiceAgreement(
  page: Page,
  opts: { title: string; serviceNamePart: string },
): Promise<void> {
  await page.getByRole("button", { name: /emitir acuerdo/i }).click();
  const agreementDialog = page.getByRole("dialog").filter({
    hasText: /emitir acuerdo de compra/i,
  });
  await expect(agreementDialog).toBeVisible({ timeout: 15_000 });

  await agreementDialog.locator("#agr-title").fill(opts.title);
  await agreementDialog.getByRole("radio", { name: /incluir servicios/i }).check();
  await agreementDialog.getByRole("button", { name: /añadir servicio/i }).click();

  await completeDualCurrencyServiceConfigWizard(page, opts.serviceNamePart);

  await agreementDialog.getByRole("button", { name: /^emitir acuerdo$/i }).click();

  await expect(page.getByText(opts.title).first()).toBeVisible({
    timeout: 25_000,
  });
}

export async function buyerRespondToAgreement(
  page: Page,
  title: string,
  action: "accept" | "reject",
): Promise<void> {
  const bubble = page
    .locator("[data-chat-agreement]")
    .filter({ hasText: title })
    .last();
  await expect(bubble).toBeVisible({ timeout: 20_000 });
  if (action === "accept") {
    await bubble.getByRole("button", { name: /^comprar$/i }).click();
    await expect(bubble.getByText(/aceptado/i)).toBeVisible({ timeout: 20_000 });
  } else {
    await bubble.getByRole("button", { name: /^rechazar$/i }).click();
    await expect(bubble.getByText(/rechazado/i)).toBeVisible({ timeout: 20_000 });
  }
}

export async function openAgreementDetailInRail(
  page: Page,
  title: string,
): Promise<void> {
  await openRailContracts(page);
  await expect(page.getByText(/no hay contratos/i)).toBeHidden({
    timeout: 15_000,
  });
  await page.getByRole("button").filter({ hasText: title }).first().click();
  await expect(
    page.getByRole("button", { name: /descargar pdf/i }).first(),
  ).toBeVisible({ timeout: 15_000 });
}

export async function sellerEditAgreementInRail(
  page: Page,
  currentTitle: string,
  newTitle: string,
  productNamePart = "Producto E2E",
): Promise<void> {
  await openAgreementDetailInRail(page, currentTitle);
  await page.getByRole("button", { name: /editar acuerdo/i }).click();
  await expect(page.getByText(/editar acuerdo enviado/i)).toBeVisible({
    timeout: 10_000,
  });
  await page.locator("#agr-title").fill(newTitle);
  await selectCatalogProduct(page, 0, productNamePart);
  await fillMerchandiseBuyerFields(page, 0);
  await page.getByRole("button", { name: /guardar cambios/i }).click();
  await expect(page.getByText(newTitle).first()).toBeVisible({
    timeout: 25_000,
  });
}

export async function createThreadAsBuyer(
  browser: Browser,
  buyerToken: string,
  offerId: string,
): Promise<{ buyerPage: Page; threadId: string }> {
  const buyerContext = await browser.newContext();
  await buyerContext.addInitScript((t: string) => {
    sessionStorage.setItem("vt_session_active", "1");
    sessionStorage.setItem("vt_session_token", t);
  }, buyerToken);
  const buyerPage = await buyerContext.newPage();
  const threadId = await openOfferAndComprar(buyerPage, offerId);
  expect(threadId).toMatch(/^cth_/);
  await waitForChatThread(buyerPage);
  return { buyerPage, threadId };
}

export async function openSellerPage(
  browser: Browser,
  sellerToken: string,
  threadId: string,
): Promise<Page> {
  const ctx = await browser.newContext();
  await injectE2ESession(ctx, sellerToken);
  const page = await ctx.newPage();
  await openChatThread(page, threadId);
  await dismissPeerPartyExitModalIfOpen(page);
  await expect(page.getByText(/cargando chat/i)).toBeHidden({
    timeout: 45_000,
  });
  await expect(
    page
      .getByRole("button", { name: /^rutas$|^contratos$|^integrantes$/i })
      .first(),
  ).toBeVisible({ timeout: 30_000 });
  return page;
}
