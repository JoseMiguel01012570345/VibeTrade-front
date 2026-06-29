import { ArrowLeft, BadgeCheck, FileText, Loader2, MoreVertical, PanelRight } from "lucide-react";
import type { NavigateFunction } from "react-router-dom";
import { cn } from "@shared/lib/cn";
import type { Thread } from "@features/market/model/store/marketStoreTypes";
import { chatThreadHeaderTitle } from "@features/chat/model/chatParticipantLabels";

type Me = { id: string; name: string };

type Props = {
  nav: NavigateFunction;
  thread: Thread;
  store: Thread["store"];
  me: Me;
  profileDisplayNames: Record<string, string>;
  offerTitle?: string;
  isSocialThread: boolean;
  railOpen: boolean;
  mobileChatActionsOpen: boolean;
  setMobileChatActionsOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  setRailOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  isActingSeller: boolean;
  /** Solo el comprador del hilo puede abrir el cobro (transportistas / terceros no). */
  showBuyerPayment: boolean;
  chatPayPreparing: boolean;
  onOpenBuyerPayment: () => void;
  chatActionsLocked: boolean;
  onEmitAgreement: () => void;
};

export function ChatPageHeader({
  nav,
  thread,
  store,
  me,
  profileDisplayNames,
  offerTitle,
  isSocialThread,
  railOpen,
  mobileChatActionsOpen,
  setMobileChatActionsOpen,
  setRailOpen,
  isActingSeller,
  showBuyerPayment,
  chatPayPreparing,
  onOpenBuyerPayment,
  chatActionsLocked,
  onEmitAgreement,
}: Props) {
  return (
    <div className="vt-card shrink-0 px-3 py-2 sm:px-[22px] sm:py-[18px]">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:gap-x-3 md:gap-y-3">
        <div className="flex min-w-0 w-full items-center gap-2.5 md:min-h-0 md:min-w-0 md:flex-1">
          <button
            className="vt-btn shrink-0"
            onClick={() => nav("/chat")}
            aria-label="Volver a la lista de chats"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 font-black tracking-[-0.03em] break-words text-[clamp(14px,3.9vw,18px)] leading-snug">
              <span>
                {thread
                  ? chatThreadHeaderTitle(
                      thread,
                      me,
                      profileDisplayNames,
                      offerTitle,
                    )
                  : store.name}
              </span>
              {store.verified ? (
                <span
                  className="inline-flex items-center text-[var(--primary)]"
                  title="Verificado"
                  aria-label="Verificado"
                >
                  <BadgeCheck size={16} aria-hidden />
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-2" />
          </div>
          <button
            type="button"
            className={cn(
              !isSocialThread && "min-[961px]:hidden",
              "grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)]",
              "bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[var(--muted)] shadow-sm transition",
              "hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] hover:text-[var(--text)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
              railOpen && "pointer-events-none opacity-0",
            )}
            aria-hidden={railOpen || undefined}
            aria-expanded={mobileChatActionsOpen}
            aria-haspopup="dialog"
            aria-label="Abrir acciones del chat"
            title="Acciones del chat"
            onClick={() => setMobileChatActionsOpen((open) => !open)}
          >
            <MoreVertical size={22} strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <div
          className={cn(
            "hidden w-full min-w-0 shrink-0 flex-wrap items-center gap-y-2 min-[961px]:ml-auto min-[961px]:w-auto min-[961px]:max-w-[52%] min-[961px]:justify-end lg:max-w-none",
            !isSocialThread && "min-[961px]:flex",
            isSocialThread && "min-[961px]:hidden",
          )}
        >
          <button
            type="button"
            className="vt-btn vt-chat-rail-toggle min-h-10 shrink-0"
            onClick={() => setRailOpen((o) => !o)}
            title="Contratos y hojas de ruta"
          >
            <PanelRight size={16} /> Panel
          </button>
          {showBuyerPayment ? (
            <button
              type="button"
              className="vt-btn min-h-10 shrink-0 inline-flex items-center justify-center gap-2"
              disabled={chatPayPreparing}
              aria-busy={chatPayPreparing}
              onClick={onOpenBuyerPayment}
              title="Pagar"
            >
              {chatPayPreparing ? (
                <>
                  <Loader2
                    size={16}
                    className="shrink-0 animate-spin"
                    aria-hidden
                  />
                  Cargando…
                </>
              ) : (
                "Pagar"
              )}
            </button>
          ) : null}
          {isActingSeller ? (
            <button
              type="button"
              className="vt-btn min-h-10 min-w-0 shrink"
              disabled={chatActionsLocked}
              title={
                chatActionsLocked
                  ? "No disponible hasta registrar el pago"
                  : "Emitir acuerdo como negocio"
              }
              onClick={onEmitAgreement}
            >
              <FileText size={16} className="shrink-0" />{" "}
              <span className="truncate">Emitir acuerdo</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
