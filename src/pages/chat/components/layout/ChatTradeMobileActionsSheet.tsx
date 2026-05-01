import { FileText, Loader2, PanelRight, Wallet, X } from "lucide-react";
import { cn } from "../../../../lib/cn";

type Props = {
  open: boolean;
  onClose: () => void;
  setRailOpen: (open: boolean) => void;
  isActingSeller: boolean;
  chatPayPreparing: boolean;
  onOpenBuyerPayment: () => Promise<void>;
  chatActionsLocked: boolean;
  onEmitAgreement: () => void;
};

export function ChatTradeMobileActionsSheet({
  open,
  onClose,
  setRailOpen,
  isActingSeller,
  chatPayPreparing,
  onOpenBuyerPayment,
  chatActionsLocked,
  onEmitAgreement,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[109] hidden max-[960px]:block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vt-chat-actions-sheet-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(2,6,23,0.52)] backdrop-blur-[3px]"
        aria-label="Cerrar menú de acciones"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex max-h-[min(70dvh,420px)] w-full flex-col justify-end pb-[env(safe-area-inset-bottom,0px)] pt-10">
        <div className="pointer-events-auto flex max-h-[min(70dvh,420px)] flex-col rounded-t-[1.125rem] border border-b-0 border-[var(--border)] bg-[var(--surface)] pt-4 shadow-[0_-12px_40px_rgba(2,6,23,0.28)]">
          <div className="flex items-center justify-between gap-3 border-b border-[color-mix(in_oklab,var(--border)_80%,transparent)] px-4 pb-3 pt-1">
            <span
              id="vt-chat-actions-sheet-title"
              className="text-[15px] font-extrabold text-[var(--text)]"
            >
              Acciones del chat
            </span>
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[var(--muted)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              aria-label="Cerrar"
              onClick={onClose}
            >
              <X size={20} strokeWidth={2.25} aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-3 pb-4 pt-3">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="flex min-h-12 w-full shrink-0 items-center justify-start gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_42%,var(--surface))] px-4 py-3 text-left text-[13px] font-bold text-[var(--text)] transition hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))]"
                onClick={() => {
                  setRailOpen(true);
                  onClose();
                }}
              >
                <PanelRight
                  size={18}
                  className="shrink-0 text-[var(--primary)]"
                  aria-hidden
                />
                Panel (contratos y rutas)
              </button>
              {!isActingSeller ? (
                <button
                  type="button"
                  className="flex min-h-12 w-full shrink-0 items-center justify-start gap-2.5 rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_42%,var(--surface))] px-4 py-3 text-left text-[13px] font-bold text-[var(--text)] transition hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={chatPayPreparing}
                  aria-busy={chatPayPreparing}
                  onClick={() => {
                    void (async () => {
                      await onOpenBuyerPayment();
                      onClose();
                    })();
                  }}
                >
                  {chatPayPreparing ? (
                    <Loader2
                      size={18}
                      className="shrink-0 animate-spin text-[var(--primary)]"
                      aria-hidden
                    />
                  ) : (
                    <Wallet
                      size={18}
                      className="shrink-0 text-[var(--primary)]"
                      aria-hidden
                    />
                  )}
                  {chatPayPreparing ? "Cargando…" : "Pagar"}
                </button>
              ) : null}
              {isActingSeller ? (
                <button
                  type="button"
                  className={cn(
                    "flex min-h-12 w-full shrink-0 items-center justify-start gap-2.5 rounded-xl border px-4 py-3 text-left text-[13px] font-bold transition",
                    chatActionsLocked
                      ? "cursor-not-allowed border-[color-mix(in_oklab,var(--muted)_40%,var(--border))] opacity-65"
                      : "border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_42%,var(--surface))] text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))]",
                  )}
                  disabled={chatActionsLocked}
                  title={
                    chatActionsLocked
                      ? "No disponible hasta registrar el pago"
                      : undefined
                  }
                  onClick={() => {
                    if (chatActionsLocked) return;
                    onEmitAgreement();
                    onClose();
                  }}
                >
                  <FileText
                    size={18}
                    className="shrink-0 text-[var(--primary)]"
                    aria-hidden
                  />
                  Emitir acuerdo
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
