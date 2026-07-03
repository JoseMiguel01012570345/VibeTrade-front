import fs from "node:fs";
import type { Browser, Download, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { openChatThread } from "./chat-helpers";
import {
  E2E_DEMO_CARD_LAST4,
  buyerHasSavedCardViaPage,
  ensureBuyerPaymentReady,
  ensurePaymentAccountViaPage,
  listSavedCardsViaPage,
} from "./e2e-payment-gateway-customer";
import {
  acceptPreselInviteAsCarrier,
  resolveRouteSheetIdByTitulo,
} from "./route-sheet-carriers-env";
import { getE2EScenario } from "./chat-env";
import {
  ensureCarrierConfirmedOnSheetStops,
  fetchRouteSheetStopIds,
} from "./e2e-logistics-api";
import {
  clickInviteCarriers,
  openRouteSheetDetail,
  openRoutesRail,
  sendCarrierInvites,
} from "./route-sheet-ui-helpers";
const PAYMENT_FEE_POLICY_URL = "";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173";

export function paymentModal(page: Page) {
  return page.getByRole("dialog").filter({ hasText: /pago del acuerdo/i });
}

export async function openChatPaymentModal(page: Page): Promise<void> {
  const payBtn = page.getByRole("button", { name: /^pagar$/i }).first();
  await expect(payBtn).toBeVisible({ timeout: 20_000 });
  await expect(payBtn).toBeEnabled({ timeout: 15_000 });
  await payBtn.click();
  await expect(paymentModal(page)).toBeVisible({ timeout: 20_000 });
  await expect(
    paymentModal(page).getByText(/cargando tarjetas/i),
  ).toBeHidden({ timeout: 45_000 });
  await dismissRouteCarrierWarningIfOpen(page);
}

export async function expectPaymentModalChrome(page: Page): Promise<void> {
  const modal = paymentModal(page);
  if (PAYMENT_FEE_POLICY_URL.length > 0) {
    const policyLink = modal.getByRole("link", {
      name: /precios \/ políticas de tarifas/i,
    });
    await expect(policyLink).toBeVisible();
    await expect(policyLink).toHaveAttribute("href", PAYMENT_FEE_POLICY_URL);
  }
  await expect(
    modal.getByRole("button", { name: /seleccionar acuerdo/i }),
  ).toBeVisible();
}

/** Card config shortcut appears only after checkout breakdown is loaded. */
export async function expectPaymentCardConfigLink(page: Page): Promise<void> {
  await expect(
    paymentModal(page).getByRole("button", {
      name: /abrir configuración de tarjetas en el perfil/i,
    }),
  ).toBeVisible({ timeout: 15_000 });
}

async function dismissRouteCarrierWarningIfOpen(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const warn = page.locator(
      '[role="dialog"][aria-labelledby="route-carrier-warning-title"]',
    );
    if (!(await warn.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }
    const ack = warn.getByRole("button", {
      name: /^entendido$/i,
    });
    if (await ack.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ack.first().click();
    } else {
      await page.keyboard.press("Escape").catch(() => null);
    }
    await expect(warn).toBeHidden({ timeout: 8_000 }).catch(() => null);
  }
}

export async function selectAgreementInPaymentModal(
  page: Page,
  titlePart: string | RegExp,
): Promise<void> {
  const modal = paymentModal(page);
  await dismissRouteCarrierWarningIfOpen(page);
  const selected = modal.getByRole("button").filter({ hasText: titlePart }).first();
  if (await selected.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }
  const trigger = modal.getByRole("button", {
    name: /seleccionar acuerdo/i,
  });
  await trigger.click();
  const option = page
    .getByRole("option")
    .filter({ hasText: titlePart })
    .first();
  await expect(option).toBeVisible({ timeout: 10_000 });
  await option.click();
  await expect(
    modal.getByRole("button").filter({ hasText: titlePart }).first(),
  ).toBeVisible({ timeout: 10_000 });
}

export async function setMerchandiseLineChecked(
  page: Page,
  lineLabel: string | RegExp,
  checked: boolean,
): Promise<void> {
  const modal = paymentModal(page);
  const label = modal
    .locator("label")
    .filter({ hasText: lineLabel })
    .first();
  await expect(label).toBeVisible({ timeout: 15_000 });
  const box = label.locator('input[type="checkbox"]');
  if (checked) await box.check();
  else await box.uncheck();
  await waitForInformeReady(page);
}

export async function setAllMerchandiseLines(
  page: Page,
  checked: boolean,
): Promise<void> {
  const modal = paymentModal(page);
  const btn = checked
    ? modal.getByRole("button", { name: /seleccionar todo/i })
    : modal.getByRole("button", { name: /^limpiar$/i });
  if (await btn.first().isVisible().catch(() => false)) {
    await btn.first().click();
    if (checked) {
      await waitForInformeReady(page);
    } else {
      await expect(
        modal
          .getByText(/marcá al menos una opción|^informe$/i)
          .first(),
      ).toBeVisible({ timeout: 30_000 });
    }
  }
}

export async function setRoutePathChecked(
  page: Page,
  pathLabelPart: string | RegExp,
  checked: boolean,
): Promise<void> {
  const modal = paymentModal(page);
  const label = modal.locator("label").filter({ hasText: pathLabelPart }).first();
  await expect(label).toBeVisible({ timeout: 15_000 });
  const box = label.locator('input[type="checkbox"]');
  if (checked) await box.check();
  else await box.uncheck();
  await waitForInformeReady(page);
}

export async function enableServiceForPayment(
  page: Page,
  serviceNamePart: string | RegExp,
): Promise<void> {
  const modal = paymentModal(page);
  const label = modal
    .locator("label")
    .filter({ hasText: serviceNamePart })
    .first();
  await expect(label).toBeVisible({ timeout: 15_000 });
  const box = label.locator('input[type="checkbox"]').first();
  if (!(await box.isChecked())) {
    await box.check();
  }
  await waitForInformeReady(page);
}

export async function pickServiceRecurrences(
  page: Page,
  recurrenceLabels: (string | RegExp)[],
  serviceNamePart: string | RegExp,
): Promise<void> {
  const modal = paymentModal(page);
  const serviceLabel = modal
    .locator("label")
    .filter({ hasText: serviceNamePart })
    .first();
  const serviceBox = serviceLabel.locator('input[type="checkbox"]').first();
  if (!(await serviceBox.isChecked())) {
    await serviceBox.check();
  }

  const multi = modal.getByRole("button", {
    name: /seleccionar recurrencias para/i,
  });
  await expect(multi).toBeVisible({ timeout: 10_000 });
  await multi.click();
  const listbox = page.getByRole("listbox", {
    name: /seleccionar recurrencias para/i,
  });
  await expect(listbox).toBeVisible({ timeout: 5_000 });

  const wantsLabel = (text: string) =>
    recurrenceLabels.some((pat) =>
      typeof pat === "string"
        ? text.toLowerCase().includes(pat.toLowerCase())
        : pat.test(text),
    );

  async function syncRecurrenceOptions(
    mode: "select" | "deselect",
  ): Promise<void> {
    const options = listbox.getByRole("option");
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      const opt = options.nth(i);
      const text = await opt.innerText();
      const want = wantsLabel(text);
      const selected = (await opt.getAttribute("aria-selected")) === "true";
      if (mode === "select" && want && !selected) await opt.click();
      if (mode === "deselect" && !want && selected) await opt.click();
    }
  }

  await syncRecurrenceOptions("select");
  await syncRecurrenceOptions("deselect");

  if (await listbox.isVisible().catch(() => false)) {
    await multi.click();
    await expect(listbox).toBeHidden({ timeout: 5_000 });
  }
  await waitForInformeReady(page);
}

/** Selecciona solo la primera recurrencia disponible (pago parcial). */
export async function pickFirstServiceRecurrenceOnly(
  page: Page,
  serviceNamePart: string | RegExp,
): Promise<void> {
  const modal = paymentModal(page);
  const serviceLabel = modal
    .locator("label")
    .filter({ hasText: serviceNamePart })
    .first();
  await expect(serviceLabel).toBeVisible({ timeout: 15_000 });
  const serviceBox = serviceLabel.locator('input[type="checkbox"]').first();
  if (!(await serviceBox.isChecked())) {
    await serviceBox.check();
  }

  const multi = modal.getByRole("button", {
    name: /seleccionar recurrencias para/i,
  });
  if (!(await multi.isVisible({ timeout: 3_000 }).catch(() => false))) {
    await waitForInformeReady(page);
    return;
  }
  await expect(multi).toBeVisible({ timeout: 10_000 });
  await multi.click();
  const listbox = page.getByRole("listbox", {
    name: /seleccionar recurrencias para/i,
  });
  await expect(listbox).toBeVisible({ timeout: 5_000 });

  const opts = listbox.getByRole("option");
  const n = await opts.count();
  if (n === 0) {
    throw new Error("No hay recurrencias disponibles para pagar");
  }
  if (n >= 2) {
    for (let i = 1; i < n; i++) {
      const opt = opts.nth(i);
      if ((await opt.getAttribute("aria-selected")) === "true") {
        await opt.click();
      }
    }
  }
  const first = opts.first();
  if ((await first.getAttribute("aria-selected")) !== "true") {
    await first.click();
  }

  if (await listbox.isVisible().catch(() => false)) {
    await multi.click();
    await expect(listbox).toBeHidden({ timeout: 5_000 });
  }
  await waitForInformeReady(page);
}

/** After a service recurrence is paid, it should not reappear as a payable option. */
export async function expectPaidServiceRecurrenceHidden(
  page: Page,
  recurrencePattern: RegExp,
  _serviceNamePart: string | RegExp,
): Promise<void> {
  const modal = paymentModal(page);
  await expect(
    modal.getByText(/recurrencias ya cobradas/i),
  ).toBeVisible({ timeout: 30_000 });
  const multi = modal.getByRole("button", {
    name: /seleccionar recurrencias para/i,
  });
  if (!(await multi.isVisible().catch(() => false))) return;
  await multi.click();
  const listbox = page.getByRole("listbox", {
    name: /seleccionar recurrencias para/i,
  });
  await expect(listbox).toBeVisible({ timeout: 5_000 });
  await expect(
    listbox.getByRole("option").filter({ hasText: recurrencePattern }),
  ).toHaveCount(0);
  if (await listbox.isVisible().catch(() => false)) {
    await multi.click();
    await expect(listbox).toBeHidden({ timeout: 5_000 });
  }
}

export async function clearServiceRecurrences(
  page: Page,
  serviceNamePart: string | RegExp,
): Promise<void> {
  const modal = paymentModal(page);
  const serviceLabel = modal
    .locator("label")
    .filter({ hasText: serviceNamePart })
    .first();
  const serviceBox = serviceLabel.locator('input[type="checkbox"]').first();
  if (await serviceBox.isChecked()) {
    await serviceBox.uncheck();
  }
  await expect(
    modal.getByText(/selecciona al menos un servicio y una recurrencia/i),
  ).toBeVisible({ timeout: 30_000 });
}

export async function waitForPayableRoutePathsInPaymentModal(
  page: Page,
): Promise<void> {
  const modal = paymentModal(page);
  await expect(
    modal.getByText(/cargando tarjetas/i),
  ).toBeHidden({ timeout: 45_000 });
  await expect(
    modal.getByText(/transporte \(hoja de ruta\)/i).first(),
  ).toBeVisible({ timeout: 30_000 });
}

export async function selectAllRoutePathsForPayment(page: Page): Promise<void> {
  const modal = paymentModal(page);
  const transport = modal
    .locator("label")
    .filter({ hasText: /incluir transporte en este cobro/i })
    .first();
  await expect(transport).toBeVisible({ timeout: 15_000 });
  const box = transport.locator('input[type="checkbox"]');
  if (!(await box.isChecked())) {
    await box.check();
  }
  await waitForInformeReady(page);
}

export async function syncBuyerRouteSheetsForCheckout(
  page: Page,
  agreementTitle: string,
  routeSheetTitle: string,
): Promise<void> {
  const { openRailContracts } = await import("./chat-helpers");
  const { openRoutesRail, openRouteSheetDetail } = await import(
    "./route-sheet-ui-helpers"
  );
  await openRailContracts(page);
  await page
    .getByRole("button")
    .filter({ hasText: agreementTitle })
    .first()
    .click();
  await expect(
    page.getByText(/vinculada ahora a:/i).first(),
  ).toContainText(routeSheetTitle, { timeout: 30_000 });
  await openRoutesRail(page);
  await openRouteSheetDetail(page, routeSheetTitle);
  await page.getByRole("button", { name: /← lista/i }).click();
}

export async function prepareBuyerRouteCheckout(
  page: Page,
  agreementTitle: string,
  routeSheetTitle: string,
  opts?: { waitForPayableRoutePaths?: boolean },
): Promise<void> {
  await syncBuyerRouteSheetsForCheckout(
    page,
    agreementTitle,
    routeSheetTitle,
  );
  await openChatPaymentModal(page);
  await selectAgreementInPaymentModal(page, agreementTitle);
  if (opts?.waitForPayableRoutePaths !== false) {
    await waitForPayableRoutePathsInPaymentModal(page);
  }
}


export async function waitForInformeReady(page: Page): Promise<void> {
  const modal = paymentModal(page);
  await expect(
    modal.getByText(/cargando tarjetas/i),
  ).toBeHidden({ timeout: 45_000 });
  await expect(
    modal
      .getByText(
        /^informe$|sin montos a cobrar|no hay importes para cobrar|marcá al menos una opción|selecciona al menos un servicio/i,
      )
      .first(),
  ).toBeVisible({
    timeout: 30_000,
  });
}

export async function expectInformeCurrencyBlocks(
  page: Page,
  currencies: string[],
): Promise<void> {
  const modal = paymentModal(page);
  await waitForInformeReady(page);
  for (const cur of currencies) {
    await expect(
      modal.getByText(new RegExp(`moneda ${cur}`, "i")).first(),
    ).toBeVisible();
    await expect(
      modal.getByText(/a cobrar \(subtotal\)/i).first(),
    ).toBeVisible();
  }
  const blocks = modal.getByText(/^moneda /i);
  await expect(blocks).toHaveCount(currencies.length);
}

export async function expectProcessorFeeAviso(
  page: Page,
  currency: string,
): Promise<void> {
  const modal = paymentModal(page);
  const block = modal
    .locator("div")
    .filter({ hasText: new RegExp(`moneda ${currency}`, "i") })
    .filter({ has: page.locator('[role="note"]') })
    .first();
  const note = block.locator('[role="note"]');
  await expect(note).toContainText(/aviso:/i);
  await expect(note).toContainText(/climate/i);
  await expect(note).toContainText(/procesador estimado/i);
  await expect(note).toContainText(/no se suma/i);
}

export async function confirmInformeCheckbox(page: Page): Promise<void> {
  await waitForInformeReady(page);
  await dismissRouteCarrierWarningIfOpen(page);
  const modal = paymentModal(page);
  const checkbox = modal.getByRole("checkbox", {
    name: /confirmo el desglose/i,
  });
  await expect(checkbox).toBeVisible({ timeout: 15_000 });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
}

export async function waitForPaymentModalIdle(page: Page): Promise<void> {
  const modal = paymentModal(page);
  await expect(
    modal.getByText(/cargando tarjetas/i),
  ).toBeHidden({ timeout: 45_000 });
  await expect(
    modal.getByRole("button", { name: /^procesando/i }),
  ).toHaveCount(0, { timeout: 45_000 });
}

export async function waitForPayCurrencyReady(
  page: Page,
  currency: "USD" | "EUR",
): Promise<void> {
  await waitForPaymentModalIdle(page);
  const modal = paymentModal(page);
  const payBtn = modal.getByRole("button", {
    name: new RegExp(`^pagar ${currency}$`, "i"),
  });
  await expect(payBtn).toBeVisible({ timeout: 30_000 });
  await expect(payBtn).toBeEnabled({ timeout: 30_000 });
}

export async function downloadPaymentInformePdf(
  page: Page,
): Promise<{ download: Download; buffer: Buffer }> {
  const modal = paymentModal(page);
  await waitForPaymentModalIdle(page);
  await waitForInformeReady(page);
  await confirmInformeCheckbox(page);
  const btn = modal.getByRole("button", {
    name: /descargar pdf informe/i,
  });
  await expect(btn).toBeEnabled({ timeout: 30_000 });

  await page.evaluate(() => {
    HTMLCanvasElement.prototype.toDataURL = function toDataURL() {
      return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    };
  });

  await page.evaluate(() => {
    const w = window as Window & {
      __vtE2ePdfBuffer?: Promise<ArrayBuffer>;
      __vtE2ePdfResolve?: (buf: ArrayBuffer) => void;
      __vtE2ePdfReject?: (err: unknown) => void;
      __vtE2ePdfRestore?: () => void;
    };
    w.__vtE2ePdfBuffer = new Promise<ArrayBuffer>((resolve, reject) => {
      w.__vtE2ePdfResolve = resolve;
      w.__vtE2ePdfReject = reject;
    });
    const capture = (blob: Blob) => {
      if (blob.size > 100) {
        void blob.arrayBuffer().then((ab) => w.__vtE2ePdfResolve?.(ab));
      }
    };
    const OrigBlob = window.Blob;
    window.Blob = function BlobParts(
      parts?: BlobPart[],
      options?: BlobPropertyBag,
    ) {
      const blob = new OrigBlob(parts, options);
      const type = options?.type ?? "";
      const bigPart =
        parts?.[0] instanceof ArrayBuffer
          ? (parts[0] as ArrayBuffer).byteLength > 400
          : false;
      if (type.includes("pdf") || bigPart) {
        capture(blob);
      }
      return blob;
    } as typeof Blob;
    const origCreateObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = ((blob: Blob) => {
      capture(blob);
      return origCreateObjectURL(blob);
    }) as typeof URL.createObjectURL;
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      const href = this.href ?? "";
      if (this.download && href.startsWith("blob:")) {
        void fetch(href)
          .then((r) => r.blob())
          .then(capture)
          .catch((err) => w.__vtE2ePdfReject?.(err));
      }
      return origClick.call(this);
    };
    w.__vtE2ePdfRestore = () => {
      window.Blob = OrigBlob;
      URL.createObjectURL = origCreateObjectURL;
      HTMLAnchorElement.prototype.click = origClick;
    };
  });

  const downloadPromise = page
    .waitForEvent("download", { timeout: 90_000 })
    .catch(() => null);
  await btn.scrollIntoViewIfNeeded();
  await btn.click();

  const download = await downloadPromise;
  if (download) {
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    const path = await download.path();
    expect(path).toBeTruthy();
    const buffer = fs.readFileSync(path!);
    return { download, buffer };
  }

  const arrayBuffer = await page.evaluate(async () => {
    const w = window as Window & { __vtE2ePdfBuffer?: Promise<ArrayBuffer> };
    const buf = await Promise.race([
      w.__vtE2ePdfBuffer,
      new Promise<ArrayBuffer>((_, reject) =>
        setTimeout(() => reject(new Error("PDF blob capture timeout")), 90_000),
      ),
    ]);
    (w as { __vtE2ePdfRestore?: () => void }).__vtE2ePdfRestore?.();
    return buf;
  });
  const buffer = Buffer.from(arrayBuffer);
  expect(buffer.length).toBeGreaterThan(500);
  expect(buffer.toString("latin1")).toContain("Informe de pago");
  return { download: download as Download, buffer };
}

export function assertInformePdfContent(
  buffer: Buffer,
  expected: {
    agreementTitle?: string;
    currencies?: string[];
    paymentFeePolicy?: boolean;
  },
): void {
  const text = buffer.toString("latin1");
  expect(text).toContain("Informe de pago");
  if (expected.agreementTitle) {
    expect(text.toLowerCase()).toContain(
      expected.agreementTitle.toLowerCase().slice(0, 20),
    );
  }
  for (const cur of expected.currencies ?? []) {
    expect(text).toMatch(new RegExp(`Moneda ${cur}`, "i"));
  }
  if (expected.paymentFeePolicy === true) {
    expect(text).toMatch(/pol[ií]ticas de tarifas/i);
  }
}

export async function clickPayCurrency(
  page: Page,
  currency: "USD" | "EUR",
): Promise<void> {
  await waitForPayCurrencyReady(page, currency);
  const modal = paymentModal(page);
  const payBtn = modal.getByRole("button", {
    name: new RegExp(`^pagar ${currency}$`, "i"),
  });
  await payBtn.click();
  await expect(
    page.getByText(/procesando|registrado|éxito|cobro|listos/i).first(),
  ).toBeVisible({ timeout: 45_000 });
  await waitForPaymentModalIdle(page);
}

export async function expectDuplicatePaymentToast(
  page: Page,
  kind: "recurrence" | "merchandise",
): Promise<void> {
  const pattern =
    kind === "recurrence"
      ? /recurrencia ya fue cobrada|ya fue cobrada/i
      : /mercadería ya fue cobrada|ya fue cobrada/i;
  await expect(page.getByText(pattern).first()).toBeVisible({
    timeout: 20_000,
  });
}

export async function expectAllPaymentsSettled(page: Page): Promise<void> {
  const modal = paymentModal(page);
  await waitForPaymentModalIdle(page);
  await expect(
    modal
      .getByText(
        /cobros listos en todas las monedas|sin montos a cobrar|no hay importes para cobrar/i,
      )
      .first(),
  ).toBeVisible({ timeout: 45_000 });
}

export async function openCardConfigFromPaymentModal(
  page: Page,
  userId: string,
): Promise<void> {
  const modal = paymentModal(page);
  await modal
    .getByRole("button", {
      name: /abrir configuración de tarjetas en el perfil/i,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`/profile/${userId}/account`), {
    timeout: 15_000,
  });
  await expect(
    page.getByRole("dialog", { name: /pagos \(simulado\)/i }),
  ).toBeVisible({ timeout: 15_000 });
}

/** Ensures buyer has at least one saved card via profile UI when payments are enabled. */
export async function ensureBuyerDemoCard(
  page: Page,
  threadId?: string,
): Promise<boolean> {
  const token = await page
    .evaluate(() => sessionStorage.getItem("vt_session_token") ?? "")
    .catch(() => "");
  if (token.trim() && (await ensureBuyerPaymentReady(token))) {
    if (threadId) await openChatThread(page, threadId);
    return true;
  }

  await ensurePaymentAccountViaPage(page);
  if (await buyerHasSavedCardViaPage(page, BASE_URL)) {
    if (threadId) await openChatThread(page, threadId);
    return true;
  }

  await page.goto(`${BASE_URL}/profile/me/account?paymentCards=1`, {
    waitUntil: "domcontentloaded",
  });
  const dialog = page.getByRole("dialog", { name: /pagos \(simulado\)/i });
  const visible = await dialog
    .isVisible({ timeout: 20_000 })
    .catch(() => false);
  if (!visible) {
    if (threadId) await openChatThread(page, threadId);
    return true;
  }

  const hasCard = await dialog
    .getByText(
      new RegExp(`\\*\\*\\*|terminada en|visa|mastercard|${E2E_DEMO_CARD_LAST4}`, "i"),
    )
    .first()
    .isVisible({ timeout: 10_000 })
    .catch(() => false);
  if (hasCard) {
    if (threadId) await openChatThread(page, threadId);
    return true;
  }

  const addBtn = dialog.getByRole("button", {
    name: /activar tarjeta demo|crear nueva tarjeta|agregar tarjeta/i,
  });
  if (!(await addBtn.isVisible().catch(() => false))) {
    if (threadId) await openChatThread(page, threadId);
    return false;
  }
  await addBtn.click();

  const cardVisible = await dialog
    .getByText(
      new RegExp(`\\*\\*\\*|terminada en|${E2E_DEMO_CARD_LAST4}|visa`, "i"),
    )
    .first()
    .isVisible({ timeout: 15_000 })
    .catch(() => false);
  if (cardVisible) {
    if (threadId) await openChatThread(page, threadId);
    return true;
  }

  const filled = await fillDemoPaymentElement(page);
  if (!filled) {
    if (threadId) await openChatThread(page, threadId);
    return false;
  }

  const saveBtn = dialog.getByRole("button", { name: /guardar tarjeta/i });
  if (await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click();
    await expect(
      dialog
        .getByText(
          new RegExp(`\\*\\*\\*|terminada en|${E2E_DEMO_CARD_LAST4}|visa`, "i"),
        )
        .first(),
    ).toBeVisible({ timeout: 45_000 });
    if (threadId) await openChatThread(page, threadId);
    return true;
  }
  if (threadId) await openChatThread(page, threadId);
  return false;
}

async function fillDemoPaymentElement(page: Page): Promise<boolean> {
  const tryMultiIframe = async (): Promise<boolean> => {
    const numberFrame = page.frameLocator('iframe[title*="Secure card number" i]');
    const numberInput = numberFrame.locator('input[name="cardnumber"], input').first();
    if (!(await numberInput.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await numberInput.fill("4242424242424242");
    const expFrame = page.frameLocator('iframe[title*="Secure expiration" i]');
    await expFrame.locator('input').first().fill("12/34");
    const cvcFrame = page.frameLocator('iframe[title*="Secure CVC" i]');
    await cvcFrame.locator('input').first().fill("123");
    return true;
  };

  const tryPaymentElementFrame = async (): Promise<boolean> => {
    const frame = page
      .frameLocator('iframe[src*="js.PaymentGateway.com"]')
      .first();
    const number = frame.locator('[name="number"]');
    if (!(await number.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await number.fill("4242 4242 4242 4242");
    await frame.locator('[name="expiry"]').fill("12 / 34");
    await frame.locator('[name="cvc"]').fill("123");
    return true;
  };

  const tryPrivateElementFields = async (): Promise<boolean> => {
    const frame = page.locator("div.__PrivatePaymentGatewayElement iframe").first();
    const fl = page.frameLocator("div.__PrivatePaymentGatewayElement iframe").first();
    if (!(await frame.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await fl.locator("#Field-numberInput").fill("4242424242424242");
    await fl.locator("#Field-expiryInput").fill("12/34");
    await fl.locator("#Field-cvcInput").fill("123");
    return true;
  };

  const tryLegacyFrame = async (): Promise<boolean> => {
    const frame = page.frameLocator('iframe[name^="__privatePaymentGatewayFrame"]').first();
    const number = frame.locator('[name="number"]');
    if (!(await number.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await number.fill("4242424242424242");
    await frame.locator('[name="expiry"]').fill("12/34");
    await frame.locator('[name="cvc"]').fill("123");
    return true;
  };

  for (const attempt of [
    tryMultiIframe,
    tryPaymentElementFrame,
    tryPrivateElementFields,
    tryLegacyFrame,
  ]) {
    if (await attempt()) return true;
  }
  return false;
}

export async function buyerHasPayCard(
  page: Page,
  threadId: string,
): Promise<boolean> {
  await ensurePaymentAccountViaPage(page);
  const cards = await listSavedCardsViaPage(page, BASE_URL);
  if (cards.length > 0) return true;

  await openChatThread(page, threadId);
  await openChatPaymentModal(page);
  const modal = paymentModal(page);
  const noCard = modal.getByRole("button", {
    name: /ir al perfil a guardar tarjeta/i,
  });
  const has = !(await noCard.isVisible({ timeout: 3_000 }).catch(() => false));
  await page.keyboard.press("Escape");
  await expect(modal).toBeHidden({ timeout: 10_000 });
  return has;
}

/** Invita transportistas ya asignados en la hoja y confirma vía presel (API). */
export async function inviteAndConfirmRouteCarriersForCheckout(
  browser: Browser,
  sellerPage: Page,
  threadId: string,
  routeTitulo: string,
  sellerToken: string,
  opts: {
    carrierSessionToken: string;
    carrier2SessionToken?: string;
    confirmSecondCarrier?: boolean;
    /** When false, presel accept only — no seller confirm on tramos (checkout blocked tests). */
    confirmCarriersOnStops?: boolean;
  },
): Promise<void> {
  const { reloadChatThread } = await import("./chat-helpers");
  await reloadChatThread(sellerPage);
  await openRoutesRail(sellerPage);
  const detailBack = sellerPage.getByRole("button", { name: /← lista/i });
  const onDetail =
    (await detailBack.isVisible({ timeout: 2_000 }).catch(() => false)) &&
    (await sellerPage.getByText(routeTitulo).first().isVisible({ timeout: 2_000 }).catch(() => false));
  if (!onDetail) {
    await openRouteSheetDetail(sellerPage, routeTitulo);
  }
  await clickInviteCarriers(sellerPage);
  await sendCarrierInvites(sellerPage);
  const routeSheetId = await resolveRouteSheetIdByTitulo(
    sellerPage,
    threadId,
    sellerToken,
    routeTitulo,
  );

  async function acceptAsCarrier(sessionToken: string): Promise<void> {
    const ctx = await browser.newContext();
    await ctx.addInitScript((t: string) => {
      sessionStorage.setItem("vt_session_active", "1");
      sessionStorage.setItem("vt_session_token", t);
    }, sessionToken);
    const carrierPage = await ctx.newPage();
    await acceptPreselInviteAsCarrier(
      carrierPage,
      threadId,
      routeSheetId,
      sessionToken,
    );
    await ctx.close();
  }

  await acceptAsCarrier(opts.carrierSessionToken);
  const acceptedSecond =
    opts.confirmSecondCarrier !== false && !!opts.carrier2SessionToken;
  if (acceptedSecond && opts.carrier2SessionToken) {
    await acceptAsCarrier(opts.carrier2SessionToken);
  }

  if (opts.confirmCarriersOnStops === false) {
    return;
  }

  const scenario = getE2EScenario()!;
  const stopIds = await fetchRouteSheetStopIds(
    sellerPage,
    sellerToken,
    threadId,
    routeSheetId,
  );
  const stop0 = stopIds[0];
  const stop1 = stopIds[1];
  const token1 = scenario.carrierSessionToken?.trim() ?? "";
  const token2 = scenario.carrier2SessionToken?.trim() ?? "";
  const primaryToken = opts.carrierSessionToken.trim();

  async function confirmOnStop(
    carrierUserId: string | undefined,
    stopId: string | undefined,
  ): Promise<void> {
    if (!carrierUserId || !stopId) return;
    await ensureCarrierConfirmedOnSheetStops(sellerPage, sellerToken, {
      threadId,
      routeSheetId,
      carrierUserId,
      stopIds: [stopId],
    });
  }

  if (primaryToken === token1) {
    await confirmOnStop(scenario.carrierUserId, stop0);
  } else if (primaryToken === token2) {
    await confirmOnStop(scenario.carrier2UserId, stop1).catch(async () => {
      const { openSubscribersPanel, subscribersPanel } = await import(
        "./route-sheet-ui-helpers"
      );
      await openSubscribersPanel(sellerPage);
      const panel = subscribersPanel(sellerPage);
      await panel
        .getByRole("button", { name: /^tramo 2\b/i })
        .first()
        .click()
        .catch(() => null);
      const acceptBtn = panel
        .getByRole("button", { name: /aceptar en este tramo/i })
        .first();
      if (await acceptBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await acceptBtn.click();
        const confirmModal = sellerPage
          .getByRole("dialog")
          .filter({ hasText: /confirmar transportista/i });
        await confirmModal
          .getByRole("button", { name: /sí, confirmar/i })
          .click()
          .catch(() => null);
      }
    });
  }

  if (acceptedSecond && opts.carrier2SessionToken?.trim() === token2) {
    await confirmOnStop(scenario.carrier2UserId, stop1).catch(() => null);
  } else if (acceptedSecond && opts.carrier2SessionToken?.trim() === token1) {
    await confirmOnStop(scenario.carrierUserId, stop0);
  }
}
