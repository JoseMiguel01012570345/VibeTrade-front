import { ArrowLeft, BadgeCheck, MoreVertical, PanelRight } from "lucide-react";
import type { NavigateFunction } from "react-router-dom";
import { cn } from "@shared/lib/cn";
import type { Thread } from "@features/market/logic/store/marketStoreTypes";
import { chatThreadHeaderTitle } from "@features/chat/logic/participants/chatParticipantLabels";
import { useMinWidth961 } from "@features/chat/hooks/useMinWidth961";

type Me = { id: string; name: string };

type Props = {
  nav: NavigateFunction;
  thread: Thread;
  store: Thread["store"];
  me: Me;
  profileDisplayNames: Record<string, string>;
  offerTitle?: string;
  isSocialThread: boolean;
  isSupportThread?: boolean;
  showLogisticsRail: boolean;
  railOpen: boolean;
  mobileChatActionsOpen: boolean;
  setMobileChatActionsOpen: (open: boolean | ((o: boolean) => boolean)) => void;
  setRailOpen: (open: boolean | ((o: boolean) => boolean)) => void;
};

export function ChatPageHeader({
  nav,
  thread,
  store,
  me,
  profileDisplayNames,
  offerTitle,
  isSocialThread,
  isSupportThread,
  showLogisticsRail,
  railOpen,
  mobileChatActionsOpen,
  setMobileChatActionsOpen,
  setRailOpen,
}: Props) {
  const wide = useMinWidth961();
  const showMobileActions = !isSocialThread && showLogisticsRail;

  return (
    <div className="vt-chat-thread-header shrink-0 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] px-3 py-2.5 sm:px-4 sm:py-3 min-[961px]:bg-[var(--surface)]">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-start md:gap-x-3 md:gap-y-3">
        <div className="flex min-w-0 w-full items-center gap-2.5 md:min-h-0 md:min-w-0 md:flex-1">
          {!wide ? (
            <button
              className="vt-btn shrink-0"
              onClick={() => nav("/chat")}
              aria-label="Volver a la lista de chats"
            >
              <ArrowLeft size={16} />
            </button>
          ) : null}
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
            {isSupportThread ? (
              <p className="mt-1 text-xs font-medium text-[var(--muted)]">
                Mensajería de soporte con la tienda (sin acuerdos ni rutas)
              </p>
            ) : null}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-2" />
          </div>
          <button
            type="button"
            className={cn(
              showMobileActions && "min-[961px]:hidden",
              "grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border)]",
              "bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))] text-[var(--muted)] shadow-sm transition",
              "hover:bg-[color-mix(in_oklab,var(--primary)_8%,var(--surface))] hover:text-[var(--text)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
              railOpen && "pointer-events-none opacity-0",
              !showMobileActions && "hidden",
            )}
            aria-hidden={railOpen || !showMobileActions || undefined}
            aria-expanded={mobileChatActionsOpen}
            aria-haspopup="dialog"
            aria-label="Abrir acciones del chat"
            title="Acciones del chat"
            onClick={() => setMobileChatActionsOpen((open) => !open)}
          >
            <MoreVertical size={22} strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        {showLogisticsRail ? (
          <div
            className={cn(
              "hidden w-full min-w-0 shrink-0 flex-wrap items-center gap-y-2 min-[961px]:ml-auto min-[961px]:w-auto min-[961px]:max-w-[52%] min-[961px]:justify-end lg:max-w-none",
              "min-[961px]:flex",
            )}
          >
            <button
              type="button"
              className="vt-btn vt-chat-rail-toggle min-h-10 shrink-0"
              onClick={() => setRailOpen((o) => !o)}
              title="Rutas e integrantes"
            >
              <PanelRight size={16} /> Panel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
