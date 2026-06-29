import { CreditCard, FileDown, Loader2 } from "lucide-react";
import { cn } from "@shared/lib/cn";
import {
  agreementDeclaresMerchandise,
} from "@features/chat/model/tradeAgreementTypes";
import { paymentFeeLabels, minorToMajor } from "@features/payments/model/paymentFeePolicy";
import { PAYMENT_FEE_POLICY_URL } from "@features/payments/model/paymentFeePolicyLinks";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { VtSelect } from "@shared/components/ui/VtSelect";
import { VtMultiSelect } from "@shared/components/ui/VtMultiSelect";
import { recurrenceSlotKey } from "@features/chat/model/chatPaymentUtils";
import { RoutePaymentCarrierWarningModal } from "./RoutePaymentCarrierWarningModal";
import {
  sanitizePaymentInformeLabel,
} from "@features/chat/model/paymentCheckoutPdfDownload";
import type { UseChatPaymentModalReturn } from "@features/chat/hooks/useChatPaymentModal";

type ChatPaymentModalBodyProps = {
  vm: UseChatPaymentModalReturn;
  onClose: () => void;
};

type Vm = UseChatPaymentModalReturn;
type PreviewItem = Vm["previews"][number];

function formatRoutePathTotals(
  path: NonNullable<Vm["payableRoutePath"]>,
): string {
  if (path.totalsByCurrency.length === 0) return "";
  const amounts = path.totalsByCurrency
    .map((t) => {
      const maj = minorToMajor(t.amountMinor, t.currencyLower);
      return `${maj} ${t.currencyLower.toUpperCase()}`;
    })
    .join(" · ");
  return ` — ${amounts}`;
}

function MerchandiseChargeSection({ vm }: { vm: Vm }) {
  const {
    merchCheckboxSectionVisible,
    serviceOnlyAgreement,
    selectedAgreement,
    payableMerchLines,
    selectedMerchandiseLineIds,
    setSelectedMerchandiseLineIds,
    setAcceptedInforme,
  } = vm;

  if (merchCheckboxSectionVisible) {
    return (
      <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
        <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
          Mercancía a incluir en este cobro
        </div>
        <p className="vt-muted mt-1 text-[12px] leading-snug">
          Marcá cada ítem de mercadería que quieras sumar al informe y al cobro.
          Desmarcar actualiza el desglose al instante.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="vt-btn vt-btn-ghost px-3 py-1 text-[12px]"
            onClick={() =>
              setSelectedMerchandiseLineIds(payableMerchLines.map((m) => m.id))
            }
          >
            Seleccionar todo
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-ghost px-3 py-1 text-[12px]"
            onClick={() => setSelectedMerchandiseLineIds([])}
          >
            Limpiar
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {payableMerchLines.map((m) => {
            const checked = selectedMerchandiseLineIds.includes(m.id);
            return (
              <label
                key={m.id}
                className="flex cursor-pointer items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5 text-[13px] text-[var(--text)]"
              >
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checked}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setSelectedMerchandiseLineIds((prev) => {
                      const set = new Set(prev);
                      if (on) set.add(m.id);
                      else set.delete(m.id);
                      return [...set];
                    });
                    setAcceptedInforme(false);
                  }}
                />
                <span className="min-w-0">
                  <span className="font-bold">{m.title}</span>
                  <span className="vt-muted mt-0.5 block text-[12px]">
                    {m.subtitle}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </section>
    );
  }

  const showMissingLineIdsWarning =
    !serviceOnlyAgreement &&
    selectedAgreement &&
    agreementDeclaresMerchandise(selectedAgreement) &&
    selectedAgreement.merchandise.length > 0;

  if (showMissingLineIdsWarning) {
    return (
      <div className="rounded-2xl border border-amber-500/35 bg-[color-mix(in_oklab,amber_8%,var(--surface))] p-3 text-[12px] leading-snug text-[var(--text)]">
        Hay mercancía en el acuerdo pero las líneas no tienen identificador
        persistido; no se puede desglosar por ítem hasta que el vendedor vuelva
        a emitir o actualice el acuerdo en el sistema.
      </div>
    );
  }

  return null;
}

function RouteTransportChargeBody({ vm }: { vm: Vm }) {
  const {
    agreementRouteSheet,
    payableRoutePath,
    routePathsAwaitingCarriers,
    includeTransportInCharge,
    setIncludeTransportInCharge,
    busyInit,
    busyPay,
    transportSelectionTouchedRef,
    setAcceptedInforme,
    agreementRoutePaths,
  } = vm;

  if (!agreementRouteSheet) {
    return (
      <p className="vt-muted mt-2 text-[13px]">
        No encontramos la hoja de ruta en este chat todavía. Abrí el chat para
        sincronizar rutas y volvé a intentar.
      </p>
    );
  }

  if (payableRoutePath == null) {
    const message =
      routePathsAwaitingCarriers.length > 0
        ? "Hay transporte con precio, pero aún no se puede cobrar hasta que todos los transportistas de cada tramo estén confirmados en la hoja de ruta."
        : "No hay transporte pendiente de cobro (o ya está pagado o parcialmente pagado).";
    return <p className="vt-muted mt-2 text-[13px]">{message}</p>;
  }

  const showPartiallyPaidWarning = agreementRoutePaths.some(
    (p) => p.partiallyPaid,
  );

  return (
    <>
      <label className="mt-2 flex cursor-pointer items-start gap-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5 text-[13px] text-[var(--text)]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={includeTransportInCharge}
          disabled={busyInit || busyPay}
          onChange={(e) => {
            transportSelectionTouchedRef.current = true;
            setIncludeTransportInCharge(e.target.checked);
            setAcceptedInforme(false);
          }}
        />
        <span className="min-w-0">
          <span className="font-bold">Incluir transporte en este cobro</span>
          <span className="vt-muted mt-0.5 block text-[12px]">
            {payableRoutePath.label}
            {formatRoutePathTotals(payableRoutePath)}
          </span>
          <ul className="vt-muted mt-1 list-disc pl-4 text-[11px]">
            {payableRoutePath.stops.map((s) => (
              <li key={s.routeStopId}>
                {s.orden}. {s.origen} → {s.destino}
              </li>
            ))}
          </ul>
        </span>
      </label>
      {showPartiallyPaidWarning ? (
        <p className="mt-2 text-[12px] text-amber-600 dark:text-amber-400">
          Hay transporte parcialmente pagado: no se puede volver a cobrar hasta
          regularizar el pago.
        </p>
      ) : null}
    </>
  );
}

function RouteTransportSection({ vm }: { vm: Vm }) {
  const { serviceOnlyAgreement, routeLegSelectionRequired } = vm;

  if (serviceOnlyAgreement || !routeLegSelectionRequired) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
      <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
        Transporte (hoja de ruta)
      </div>
      <p className="vt-muted mt-1 text-[12px] leading-snug">
        Podés incluir o excluir el transporte de la hoja de ruta en este cobro
        (combinable con mercancía).
      </p>
      <RouteTransportChargeBody vm={vm} />
    </section>
  );
}

function PaidRecurrencesBanner({ vm }: { vm: Vm }) {
  const {
    serviceOnlyAgreement,
    paidRecurrenceSummaryLines,
    allRecurrencesPaidVerified,
  } = vm;

  if (
    !serviceOnlyAgreement ||
    paidRecurrenceSummaryLines.length === 0 ||
    allRecurrencesPaidVerified
  ) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
      <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
        Recurrencias ya cobradas
      </div>
      <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[12px] leading-snug text-[var(--text)]">
        {paidRecurrenceSummaryLines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

function ServicePaymentSection({ vm }: { vm: Vm }) {
  const {
    serviceOnlyAgreement,
    hybridServiceBlocks,
    serviceItems,
    paidSlotKeys,
    selectedServiceEntriesByServiceId,
    setSelectedServiceEntriesByServiceId,
    setAcceptedInforme,
  } = vm;

  if (!serviceOnlyAgreement && !hybridServiceBlocks) {
    return null;
  }

  const hint = serviceOnlyAgreement
    ? "Este acuerdo contiene solo servicios. Selecciona uno o varios servicios y, para cada uno, la recurrencia a pagar. Las ya cobradas no aparecen."
    : "Este acuerdo incluye servicios: marcá servicios y recurrencias si querés sumarlos a este cobro (podés combinarlos con mercancía y la hoja de ruta). Cada cambio actualiza el desglose.";

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
      <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
        Servicios a pagar
      </div>
      <p className="vt-muted mt-1 text-[12px] leading-snug">{hint}</p>
      {serviceItems.length === 0 ? (
        <p className="vt-muted mt-2 text-[13px]">
          No hay servicios configurados en este acuerdo.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {serviceItems.map((sv) => (
            <ServicePaymentRow
              key={sv.id}
              service={sv}
              paidSlotKeys={paidSlotKeys}
              pickedKeys={selectedServiceEntriesByServiceId[sv.id] ?? []}
              onSelectionChange={setSelectedServiceEntriesByServiceId}
              onAcceptedInformeChange={setAcceptedInforme}
            />
          ))}
        </div>
      )}
    </section>
  );
}

type ServicePaymentRowProps = {
  service: Vm["serviceItems"][number];
  paidSlotKeys: Vm["paidSlotKeys"];
  pickedKeys: string[];
  onSelectionChange: Vm["setSelectedServiceEntriesByServiceId"];
  onAcceptedInformeChange: Vm["setAcceptedInforme"];
};

function ServicePaymentRow({
  service: sv,
  paidSlotKeys,
  pickedKeys,
  onSelectionChange,
  onAcceptedInformeChange,
}: ServicePaymentRowProps) {
  const allEntries =
    sv.recurrenciaPagos?.entries?.map((e) => ({
      value: `${e.month}-${e.day}`,
      label: `Mes ${e.month} · Día ${e.day} · ${e.amount} ${e.moneda}`,
      raw: e,
    })) ?? [];
  const unpaidEntryOptions = allEntries.filter(
    (o) => !paidSlotKeys.has(recurrenceSlotKey(sv.id, o.raw.month, o.raw.day)),
  );
  const hasUnpaid = unpaidEntryOptions.length > 0;
  const checked = hasUnpaid && pickedKeys.length > 0;
  const serviceLabel = sv.tipoServicio || "Servicio";

  if (!hasUnpaid) {
    return (
      <div className="rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5">
        <div className="text-[13px] font-bold text-[var(--text)]">
          {serviceLabel}
        </div>
        <p className="vt-muted mt-1 mb-0 text-[12px] leading-snug">
          Todas las recurrencias de este servicio ya fueron cobradas.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] p-2.5">
      <label className="flex cursor-pointer items-start gap-2 text-[13px] font-bold text-[var(--text)]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={checked}
          onChange={(e) => {
            const nextOn = e.target.checked;
            onSelectionChange((prev) => {
              if (nextOn) {
                const first = unpaidEntryOptions[0]?.raw;
                const def = first ? [`${first.month}-${first.day}`] : [];
                return {
                  ...prev,
                  [sv.id]: prev[sv.id]?.length ? prev[sv.id] : def,
                };
              }
              const { [sv.id]: _drop, ...rest } = prev;
              return rest;
            });
            onAcceptedInformeChange(false);
          }}
        />
        <span className="min-w-0 break-words">{serviceLabel}</span>
      </label>
      {checked ? (
        <div className="mt-2">
          <div className="vt-muted mb-1 text-[11px] font-black uppercase tracking-wide">
            Recurrencias a pagar
          </div>
          <VtMultiSelect
            value={pickedKeys}
            onChange={(next) => {
              onSelectionChange((prev) => {
                if (next.length === 0) {
                  const { [sv.id]: _drop, ...rest } = prev;
                  return rest;
                }
                return { ...prev, [sv.id]: next };
              });
              onAcceptedInformeChange(false);
            }}
            options={unpaidEntryOptions.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            ariaLabel={`Seleccionar recurrencias para ${serviceLabel}`}
            buttonClassName="min-h-10 bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] border-[color-mix(in_oklab,var(--border)_90%,transparent)] shadow-[inset_0_1px_0_rgba(2,6,23,0.55)]"
          />
        </div>
      ) : null}
    </div>
  );
}

function PreviewAttachment({ item }: { item: PreviewItem }) {
  if (item.kind === "image") {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--border)]">
        <div className="bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] px-2 py-1 text-[11px] font-bold leading-tight">
          {item.label}
        </div>
        <ProtectedMediaImg
          src={item.url}
          alt=""
          wrapperClassName="aspect-[4/3] w-full bg-[var(--surface)]"
          className="max-h-[180px] w-full object-contain"
        />
      </div>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] p-3 text-[13px] font-semibold text-[var(--primary)] underline"
    >
      {item.label} — abrir documento / enlace
    </a>
  );
}

function PaymentCheckoutContent({ vm }: { vm: Vm }) {
  const {
    checkoutSelectionsReady,
    serviceOnlyAgreement,
    allRecurrencesPaidVerified,
    busyPay,
    busyInit,
    breakdown,
    paidRecurrenceSummaryLines,
    previews,
    acceptedInforme,
    setAcceptedInforme,
    allPaid,
    handlePdfDownload,
    fmt,
    informeCurrencyPaidDisplay,
  } = vm;

  const allRecurrencesComplete =
    serviceOnlyAgreement && allRecurrencesPaidVerified && !busyPay;

  if (!checkoutSelectionsReady && !allRecurrencesComplete) {
    const hint = serviceOnlyAgreement
      ? "Selecciona al menos un servicio y una recurrencia para ver el desglose de pago."
      : "Marcá al menos una opción: mercancía, tramo de ruta o cuota de servicio (según corresponda al acuerdo).";
    return (
      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--border)_85%,transparent)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3 text-[13px] leading-snug text-[var(--text)]">
        {hint}
      </div>
    );
  }

  if (allRecurrencesComplete) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-[color-mix(in_oklab,emerald_10%,var(--surface))] p-3 text-[13px] leading-snug text-emerald-900 dark:text-emerald-100">
        <p className="m-0 font-bold">
          Cobros listos en todas las monedas necesarias del acuerdo.
        </p>
        {paidRecurrenceSummaryLines.length > 0 ? (
          <ul className="mt-2 mb-0 list-disc space-y-0.5 pl-5 text-[12px] opacity-95">
            {paidRecurrenceSummaryLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (busyInit) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-10"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          className="h-9 w-9 animate-spin text-[var(--primary)]"
          aria-hidden
        />
        <p className="vt-muted text-center text-[13px] leading-snug">
          Cargando tarjetas, acuerdos y desglose de pago…
        </p>
      </div>
    );
  }

  if (breakdown && !breakdown.ok) {
    return (
      <div className="rounded-2xl border border-[color-mix(in_oklab,var(--bad)_42%,var(--border))] bg-[color-mix(in_oklab,var(--bad)_10%,var(--surface))] p-3 text-[13px] leading-snug">
        {breakdown.errors.map((e) => (
          <div key={e}>• {e}</div>
        ))}
      </div>
    );
  }

  if (breakdown?.ok && breakdown.byCurrency.length === 0) {
    return (
      <div className="vt-muted text-[13px]">
        Sin montos a cobrar en este momento.
      </div>
    );
  }

  if (!breakdown?.ok || breakdown.byCurrency.length === 0) {
    if (!busyInit && !breakdown) {
      return (
        <p className="vt-muted text-[13px] leading-snug">
          No pudimos obtener el informe desde el servidor. Revisa la conexión o
          volvé a intentar más tarde.
        </p>
      );
    }
    return null;
  }

  return (
    <>
      <section className="rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] p-3">
        <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
          Informe
        </div>
        <div className="mt-2 space-y-3">
          {breakdown.byCurrency.map((bc) => {
            const c = bc.currencyLower;
            const paid = informeCurrencyPaidDisplay(c);
            const refCombo = bc.climateMinor + bc.processorFeeMinor;
            return (
              <div
                key={c}
                className="space-y-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_80%,transparent)] bg-[color-mix(in_oklab,var(--surface)_94%,transparent)] px-3 py-2"
              >
                <div
                  className="rounded-lg border border-[color-mix(in_oklab,#f59e0b_45%,var(--border))] bg-[color-mix(in_oklab,#f59e0b_10%,var(--surface))] px-2.5 py-1.5 text-[11px] leading-snug text-[var(--text)]"
                  role="note"
                >
                  <span className="font-black">Aviso:</span> Climate + procesador
                  estimado (~{fmt(refCombo, c)}) es solo referencia; no se suma al
                  cobro con tarjeta ({fmt(bc.totalMinor, c)}).
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[13px] font-black">
                    Moneda {c.toUpperCase()}
                    {paid ? (
                      <span className="vt-muted ml-2 text-[11px] font-bold">
                        — cobro OK
                      </span>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[13px] font-bold">
                      {fmt(bc.totalMinor, c)}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">
                      A cobrar (subtotal)
                    </div>
                  </div>
                </div>
                <div className="vt-muted mt-1 grid gap-0.5 text-[12px]">
                  <div>
                    Referencia Climate ({paymentFeeLabels.climateRateDisplay}):{" "}
                    {fmt(bc.climateMinor, c)} · tarifa de procesador est. (
                    {paymentFeeLabels.processorPctDisplay}):{" "}
                    {fmt(bc.processorFeeMinor, c)} · Combinado ref.:{" "}
                    {fmt(refCombo, c)}
                  </div>
                </div>
                <ul className="mt-1.5 list-none space-y-2 text-[12px] text-[var(--text)] opacity-92">
                  {bc.lines.map((ln, ix) => (
                    <li
                      key={`${ln.label}-${ix}`}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-[color-mix(in_oklab,var(--border)_55%,transparent)] pb-2 last:border-b-0 last:pb-0"
                    >
                      <span className="min-w-0 max-w-full flex-[1_1_10rem] break-words [overflow-wrap:anywhere] leading-snug">
                        <span className="font-bold text-[var(--muted)]">• </span>
                        {sanitizePaymentInformeLabel(ln.label)}
                      </span>
                      <span className="ml-auto shrink-0 font-mono font-semibold tabular-nums">
                        {fmt(ln.amountMinor, c)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {previews.length > 0 ? (
        <section>
          <div className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
            Previsualización de adjuntos
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {previews.map((p) => (
              <PreviewAttachment key={p.url} item={p} />
            ))}
          </div>
        </section>
      ) : null}

      <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_52%,var(--surface))] p-3 text-[13px] leading-snug">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={acceptedInforme || allPaid}
          onChange={(e) => setAcceptedInforme(e.target.checked)}
        />
        <span>
          Confirmo el desglose: el cobro es el subtotal del acuerdo; las líneas
          Climate y procesador son referencias informativas. Revisá conceptos
          incluidos y adjuntos del vendedor antes de pagar con tarjeta.
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="vt-btn inline-flex items-center gap-2"
          disabled={busyInit}
          onClick={() => void handlePdfDownload()}
        >
          <FileDown size={16} aria-hidden />
          Descargar PDF informe (+ QR enlaces solo en archivo)
        </button>
      </div>
    </>
  );
}

function PaymentFooterActions({
  vm,
  onClose,
}: {
  vm: Vm;
  onClose: () => void;
}) {
  const {
    allPaid,
    serviceOnlyAgreement,
    allRecurrencesPaidVerified,
    busyPay,
    hasAgreement,
    cards,
    pendingCurrencies,
    nav,
    me,
    acceptedInforme,
    selectedCardId,
    setSelectedCardId,
    checkoutSelectionsReady,
    handlePayCurrency,
    cardOptions,
  } = vm;

  const showAllPaidBanner =
    allPaid &&
    !(serviceOnlyAgreement && allRecurrencesPaidVerified && !busyPay);

  const showAddCardCta = !allPaid && hasAgreement && !cards.length;

  const showPayRow =
    !allPaid &&
    hasAgreement &&
    cards.length > 0 &&
    pendingCurrencies.length > 0;

  const pendingCurrency = pendingCurrencies[0]?.trim() ?? "";
  const pendingCurrencyOk = pendingCurrency.length >= 3;
  const payDisabled =
    busyPay ||
    !acceptedInforme ||
    !selectedCardId.trim() ||
    !pendingCurrencyOk ||
    !checkoutSelectionsReady;

  return (
    <div className="vt-modal-actions flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3">
      {showAllPaidBanner ? (
        <div className="rounded-xl px-3 py-2 text-[13px] font-bold text-emerald-600">
          Cobros listos en todas las monedas necesarias del acuerdo.
        </div>
      ) : null}

      {showAddCardCta ? (
        <button
          type="button"
          className="vt-btn vt-btn-primary w-full sm:ml-auto sm:w-auto"
          onClick={() =>
            nav(
              `/profile/${encodeURIComponent(me.id)}/account?paymentCards=1`,
            )
          }
        >
          Ir al perfil a guardar tarjeta
        </button>
      ) : null}

      {showPayRow ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-xl border border-[color-mix(in_oklab,var(--border)_88%,transparent)] bg-[color-mix(in_oklab,var(--bg)_35%,var(--surface))] p-2.5 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2">
            <VtSelect
              className="min-w-0 w-full sm:flex-1 sm:min-w-[200px]"
              value={selectedCardId}
              onChange={setSelectedCardId}
              options={cardOptions}
              listPortal
              ariaLabel={`Tarjeta para cobro en ${pendingCurrency.toUpperCase()}`}
              buttonClassName="min-h-10 border-[color-mix(in_oklab,var(--border)_90%,transparent)] bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] shadow-[inset_0_1px_0_rgba(2,6,23,0.55)]"
            />
            <div className="flex flex-wrap gap-2 sm:ml-auto sm:items-center sm:justify-end">
              <button
                type="button"
                className="vt-btn shrink-0"
                disabled={payDisabled}
                onClick={() => void handlePayCurrency(pendingCurrency)}
              >
                {busyPay ? "Procesando…" : `Pagar ${pendingCurrency.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="vt-btn vt-btn-ghost order-last min-h-10 w-full justify-center px-5 py-2.5 no-underline border border-[color-mix(in_oklab,var(--border)_80%,transparent)] sm:w-auto sm:self-end"
        onClick={onClose}
        disabled={busyPay}
      >
        Cerrar
      </button>
    </div>
  );
}

export function ChatPaymentModalBody({ vm, onClose }: ChatPaymentModalBodyProps) {
  const {
    hasAgreement,
    feePolicyQrDataUrl,
    agreementId,
    setAgreementId,
    setAcceptedInforme,
    agreementOptions,
    breakdown,
    allPaid,
    nav,
    me,
  } = vm;

  return (
    <div
      className="vt-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className={cn(
          "vt-modal relative flex max-h-[min(88vh,780px)] w-full max-w-[560px] flex-col overflow-hidden p-0",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-pay-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <RoutePaymentCarrierWarningModal
          open={vm.carrierWarningOpen}
          routeSheetTitle={vm.carrierWarningSheetTitle}
          onAcknowledge={() => vm.setCarrierWarningOpen(false)}
        />
        <div className="border-b border-[var(--border)] px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div
                id="chat-pay-title"
                className="vt-modal-title flex items-center gap-2"
              >
                <CreditCard size={18} aria-hidden /> Pago del acuerdo
              </div>
              <p className="vt-muted mt-1 text-[12px] leading-snug">
                Elegí acuerdo con el selector. En acuerdos con mercancía y/o hoja
                de ruta marcá qué líneas de mercadería incluís y si sumás la hoja
                de ruta (todos los tramos pendientes); el desglose se actualiza al
                cambiar la selección. En acuerdos solo servicios, elegí las cuotas
                a pagar. La referencia Climate (
                {paymentFeeLabels.climateRateDisplay}) y la tarifa de procesador
                estimada ({paymentFeeLabels.processorPctDisplay} + fijo) son
                informativas y no se suman al cargo.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
              <a
                href={PAYMENT_FEE_POLICY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-black text-[var(--primary)] underline decoration-1 underline-offset-2"
              >
                Precios / políticas de tarifas
              </a>
              {feePolicyQrDataUrl ? (
                <img
                  src={feePolicyQrDataUrl}
                  alt="Código QR a políticas de tarifas"
                  className="size-14 rounded-md border border-[var(--border)] bg-white p-0.5"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {!hasAgreement ? (
            <p className="text-[13px] text-[var(--text)] leading-snug">
              No hay un acuerdo aceptado en este chat. El vendedor debe emitir
              uno y vos aceptarlo antes de pagar aquí.
            </p>
          ) : (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-black uppercase tracking-wide text-[var(--muted)]">
                  Acuerdo
                </span>
                <VtSelect
                  value={agreementId}
                  onChange={(value) => {
                    setAgreementId(value);
                    setAcceptedInforme(false);
                  }}
                  options={agreementOptions}
                  listPortal
                  ariaLabel="Seleccionar acuerdo"
                  buttonClassName="min-h-10 bg-[color-mix(in_oklab,var(--bg)_40%,var(--surface))] border-[color-mix(in_oklab,var(--border)_90%,transparent)] shadow-[inset_0_1px_0_rgba(2,6,23,0.55)]"
                />
              </label>

              <MerchandiseChargeSection vm={vm} />
              <RouteTransportSection vm={vm} />
              <PaidRecurrencesBanner vm={vm} />
              <ServicePaymentSection vm={vm} />
              <PaymentCheckoutContent vm={vm} />

              {!allPaid && breakdown?.ok ? (
                <button
                  type="button"
                  className="vt-btn vt-btn-ghost w-full justify-center text-[13px]"
                  onClick={() =>
                    nav(
                      `/profile/${encodeURIComponent(me.id)}/account?paymentCards=1`,
                    )
                  }
                >
                  Abrir configuración de tarjetas en el perfil
                </button>
              ) : null}
            </>
          )}
        </div>

        <PaymentFooterActions vm={vm} onClose={onClose} />
      </div>
    </div>
  );
}
