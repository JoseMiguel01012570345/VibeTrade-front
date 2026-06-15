import type { Page, Request } from "@playwright/test";
import { expect } from "@playwright/test";
import {
  openRoutesRail,
  openRouteSheetDetail,
} from "./route-sheet-ui-helpers";
import { logisticsFlowState } from "./e2e-logistics-env";
import { ensureCarrierLegReadyForCede } from "./e2e-logistics-api";

function routeLeg(page: Page, tramoIndex = 0) {
  return page.getByRole("listitem").nth(tramoIndex);
}

function logisticsPanel(page: Page, tramoIndex = 0) {
  return routeLeg(page, tramoIndex).filter({
    has: page.getByText(/^Logística$/i),
  });
}

export async function openLogisticsRouteSheet(
  page: Page,
  routeSheetTitulo: string,
): Promise<void> {
  const panel = logisticsPanel(page, 0);
  const panelOpen = await panel.isVisible({ timeout: 3_000 }).catch(() => false);
  if (panelOpen) {
    const onSheet = await page
      .getByText(routeSheetTitulo, { exact: false })
      .first()
      .isVisible({ timeout: 2_000 })
      .catch(() => false);
    if (onSheet) return;
  }
  await openRoutesRail(page);
  await openRouteSheetDetail(page, routeSheetTitulo);
  await expect(logisticsPanel(page, 0)).toBeVisible({ timeout: 30_000 });
}

export async function expectLegEstado(
  page: Page,
  estadoPattern: RegExp,
  tramoIndex = 0,
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  await expect(panel.getByText(/estado:/i)).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText(estadoPattern).first()).toBeVisible({
    timeout: 15_000,
  });
}

export async function expectCedeOwnershipButtonVisible(
  page: Page,
  tramoIndex = 0,
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  await expect(
    panel.getByRole("button", { name: /ceder ownership/i }),
  ).toBeVisible({ timeout: 45_000 });
}

export async function expectCedeOwnershipButtonAbsent(
  page: Page,
  tramoIndex = 0,
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  await expect(
    panel.getByRole("button", { name: /ceder ownership/i }),
  ).toHaveCount(0);
}

export async function expectLiveMapButtonVisible(page: Page): Promise<void> {
  await expect(
    page.getByRole("button", { name: /mapa en vivo/i }).first(),
  ).toBeVisible({ timeout: 45_000 });
}

export async function expectLiveMapCarrierPinVisible(page: Page): Promise<void> {
  const mapDialog = page
    .getByRole("dialog")
    .filter({ has: page.locator("#vt-live-route-title") });
  await expect(mapDialog).toBeVisible({ timeout: 15_000 });
  await expect(mapDialog.locator(".vt-carrier-loc-pin").first()).toBeVisible({
    timeout: 45_000,
  });
}

export async function expectEvidenceButtonAbsent(
  page: Page,
  tramoIndex = 0,
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  await expect(
    panel.getByRole("button", { name: /evidencia de entrega/i }),
  ).toHaveCount(0);
}

export async function expectEvidenceButtonVisible(
  page: Page,
  tramoIndex = 0,
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  await expect(
    panel.getByRole("button", { name: /evidencia de entrega/i }),
  ).toBeVisible({ timeout: 15_000 });
}

export async function expectSellerPauseButtonVisible(
  page: Page,
  tramoIndex = 0,
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  await expect(
    panel.getByRole("button", { name: /pausar tramo/i }),
  ).toBeVisible({ timeout: 15_000 });
}

export async function expectSellerPauseButtonAbsent(
  page: Page,
  tramoIndex = 0,
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  await expect(
    panel.getByRole("button", { name: /pausar tramo/i }),
  ).toHaveCount(0);
}

export async function cedeOwnershipViaUI(
  page: Page,
  tramoIndex = 0,
  routeSheetTitulo?: string,
): Promise<void> {
  const titulo =
    routeSheetTitulo ?? logisticsFlowState.lastScenario?.routeSheetTitulo;

  const sc = logisticsFlowState.lastScenario;
  if (sc) {
    const token = await page
      .evaluate(() => sessionStorage.getItem("vt_session_token") ?? "")
      .catch(() => "");
    if (token.trim().length > 0) {
      await ensureCarrierLegReadyForCede(page, token, sc, tramoIndex);
    }
  }

  function cedeBtn() {
    return logisticsPanel(page, tramoIndex).getByRole("button", {
      name: /ceder ownership/i,
    });
  }

  async function refreshRouteSheetForCede(): Promise<void> {
    if (!titulo) return;
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(/cargando chat/i)).toBeHidden({
      timeout: 45_000,
    });
    if (sc) {
      const token = await page
        .evaluate(() => sessionStorage.getItem("vt_session_token") ?? "")
        .catch(() => "");
      if (token.trim().length > 0) {
        await ensureCarrierLegReadyForCede(page, token, sc, tramoIndex);
      }
    }
    await openLogisticsRouteSheet(page, titulo);
  }

  if (!(await cedeBtn().isVisible({ timeout: 8_000 }).catch(() => false))) {
    await refreshRouteSheetForCede();
  }
  if (!(await cedeBtn().isVisible({ timeout: 15_000 }).catch(() => false))) {
    await refreshRouteSheetForCede();
  }
  await expect(cedeBtn()).toBeVisible({ timeout: 60_000 });
  await cedeBtn().click();
  const modal = page
    .getByRole("dialog")
    .filter({
      hasText: /ceder titularidad del paquete|final de la trayectoria/i,
    });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal
    .getByRole("button", { name: /sí, ceder|acepto/i })
    .first()
    .click();

  const evidenceBtn = logisticsPanel(page, tramoIndex).getByRole("button", {
    name: /evidencia de entrega/i,
  });
  const cedeSucceeded = await Promise.race([
    expect(modal)
      .toBeHidden({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false),
    expect(evidenceBtn)
      .toBeVisible({ timeout: 30_000 })
      .then(() => true)
      .catch(() => false),
  ]);
  if (!cedeSucceeded) {
    throw new Error(
      `cedeOwnershipViaUI: cede did not complete for tramo ${tramoIndex + 1}`,
    );
  }
  if (!(await evidenceBtn.isVisible({ timeout: 12_000 }).catch(() => false))) {
    if (titulo) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(page.getByText(/cargando chat/i)).toBeHidden({
        timeout: 45_000,
      });
      await openLogisticsRouteSheet(page, titulo);
    }
  }
  await expect(evidenceBtn).toBeVisible({ timeout: 30_000 });
}

export async function submitEvidenceViaUI(
  page: Page,
  opts: { note?: string; tramoIndex?: number } = {},
): Promise<void> {
  const tramoIndex = opts.tramoIndex ?? 0;
  const panel = logisticsPanel(page, tramoIndex);
  await panel.getByRole("button", { name: /evidencia de entrega/i }).click();
  const modal = page
    .getByRole("dialog")
    .filter({ hasText: /evidencia de entrega/i });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  if (opts.note) {
    const ta = modal.locator("textarea").first();
    if (await ta.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await ta.fill(opts.note);
    }
  }
  await modal.getByRole("button", { name: /enviar evidencia/i }).click();
  await expect(
    page.getByText(/evidencia enviada/i).first(),
  ).toBeVisible({ timeout: 20_000 });
}

export async function sellerDecideEvidenceViaUI(
  page: Page,
  decision: "accept" | "reject",
  tramoIndex = 0,
  opts?: { allowRouteSheetCompleted?: boolean },
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  const label =
    decision === "accept" ? /aceptar evidencia/i : /rechazar evidencia/i;
  const actionBtn = panel.getByRole("button", { name: label });
  await expect(actionBtn).toBeVisible({ timeout: 15_000 });
  await actionBtn.click();
  const estadoPattern =
    decision === "accept"
      ? /evidencia aceptada — tramo cerrado/i
      : /evidencia rechazada — puede reenviarse/i;
  if (decision === "accept" && opts?.allowRouteSheetCompleted) {
    const settled = await panel
      .getByText(estadoPattern)
      .first()
      .isVisible({ timeout: 15_000 })
      .catch(() => false);
    if (!settled) return;
  }
  await expectLegEstado(page, estadoPattern, tramoIndex);
}

export async function sellerPauseTramoViaUI(
  page: Page,
  reason: string,
  tramoIndex = 0,
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  await panel.getByRole("button", { name: /pausar tramo/i }).click();
  const modal = page
    .getByRole("dialog")
    .filter({ hasText: /pausar tramo/i });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.locator("textarea").first().fill(reason);
  await modal.getByRole("button", { name: /confirmar pausa/i }).click();
  await expect(
    page.getByText(/tramo en pausa|custodia tienda/i).first(),
  ).toBeVisible({ timeout: 15_000 });
}

export async function sellerResumeTramoViaUI(
  page: Page,
  tramoIndex = 0,
): Promise<void> {
  const panel = logisticsPanel(page, tramoIndex);
  const resumeBtn = panel.getByRole("button", { name: /reanudar tramo/i });
  await expect(resumeBtn).toBeVisible({ timeout: 60_000 });
  await resumeBtn.click();
  const modal = page
    .getByRole("dialog")
    .filter({ hasText: /reanudar tramo/i });
  await expect(modal).toBeVisible({ timeout: 10_000 });
  const select = modal.locator("select").first();
  if (await select.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const options = await select.locator("option").all();
    if (options.length > 1) {
      await select.selectOption({ index: 1 });
    }
  }
  await modal.getByRole("button", { name: /^reanudar$/i }).click();
  await expect(
    page.getByText(/tramo reanudado|en tránsito/i).first(),
  ).toBeVisible({ timeout: 15_000 });
}

export async function openLiveMapModal(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /mapa en vivo/i })
    .first()
    .click();
  await expect(page.locator("#vt-live-route-title")).toBeVisible({
    timeout: 15_000,
  });
}

export async function openChatLeaveModalFromList(
  page: Page,
  threadLabel: RegExp | string,
): Promise<void> {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const row =
    typeof threadLabel === "string"
      ? page.getByRole("link", { name: new RegExp(threadLabel, "i") }).first()
      : page.getByRole("link", { name: threadLabel }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.hover();
  const leaveBtn = page.getByRole("button", { name: /salir del chat/i }).first();
  if (await leaveBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await leaveBtn.click();
  } else {
    await row.click({ button: "right" }).catch(() => null);
    await page.getByRole("menuitem", { name: /salir/i }).click().catch(async () => {
      await page.getByRole("button", { name: /salir/i }).first().click();
    });
  }
  await expect(page.locator("#chat-leave-title")).toBeVisible({
    timeout: 10_000,
  });
}

export async function confirmChatLeave(page: Page): Promise<void> {
  const modal = page.getByRole("dialog").filter({ has: page.locator("#chat-leave-title") });
  await modal.getByRole("button", { name: /sí, salir/i }).click();
}

export type TelemetrySpy = {
  getCount: () => number;
  waitForAtLeast: (n: number, timeoutMs?: number) => Promise<void>;
  assertNoFurtherPosts: (quietMs: number) => Promise<void>;
  dispose: () => void;
};

export type TelemetrySpyFilter = {
  agreementId?: string;
  routeStopId?: string;
  routeSheetId?: string;
};

export function startTelemetryRequestSpy(
  page: Page,
  filter?: TelemetrySpyFilter,
): TelemetrySpy {
  let count = 0;
  const handler = (req: Request) => {
    if (req.method() !== "POST" || !/\/logistics\/telemetry/.test(req.url())) {
      return;
    }
    if (filter?.agreementId) {
      const aid = encodeURIComponent(filter.agreementId);
      if (!req.url().includes(`/agreements/${aid}/logistics/telemetry`)) {
        return;
      }
    }
    if (filter?.routeStopId || filter?.routeSheetId) {
      let body: Record<string, unknown> | null = null;
      try {
        body = req.postDataJSON() as Record<string, unknown>;
      } catch {
        return;
      }
      if (
        filter.routeStopId &&
        String(body?.routeStopId ?? "") !== filter.routeStopId
      ) {
        return;
      }
      if (
        filter.routeSheetId &&
        String(body?.routeSheetId ?? "") !== filter.routeSheetId
      ) {
        return;
      }
    }
    count += 1;
  };
  page.on("request", handler);
  return {
    getCount: () => count,
    async waitForAtLeast(n: number, timeoutMs = 25_000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (count >= n) return;
        await page.waitForTimeout(500);
      }
      throw new Error(
        `Expected at least ${n} telemetry POST(s), got ${count}`,
      );
    },
    async assertNoFurtherPosts(quietMs: number) {
      const baseline = count;
      await page.waitForTimeout(quietMs);
      if (count !== baseline) {
        throw new Error(
          `Expected no new telemetry POSTs; baseline=${baseline} now=${count}`,
        );
      }
    },
    dispose: () => {
      page.off("request", handler);
    },
  };
}

export async function expectRouteSheetAbsentFromRail(
  page: Page,
  routeSheetTitulo: string,
): Promise<void> {
  await openRoutesRail(page);
  await expect(
    page.getByRole("listitem").filter({ hasText: routeSheetTitulo }),
  ).toHaveCount(0, { timeout: 30_000 });
  await expect(
    page.getByRole("button", { name: routeSheetTitulo, exact: false }),
  ).toHaveCount(0);
}
