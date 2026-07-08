import { ModalContext } from "flowbite-react";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll, unlockBodyScroll } from "@shared/lib/bodyScrollLock";
import {
  backdropTransitionClasses,
  panelTransitionClasses,
} from "./ceModalTransitionTheme";
import { useModalTransition } from "./useModalTransition";

type ModalSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl";

const MODAL_SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
};

const DEFAULT_PANEL_INNER =
  "relative flex max-h-[min(90dvh,720px)] w-full flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow)]";

const DEFAULT_BACKDROP = "vt-modal-backdrop-btn";

type ModalThemeSlice = {
  root?: {
    base?: string;
    show?: { on?: string; off?: string };
    [key: string]: unknown;
  };
  content?: {
    inner?: string;
  };
  header?: Record<string, unknown>;
  body?: Record<string, unknown>;
  footer?: Record<string, unknown>;
  [key: string]: unknown;
};

function backdropClassesFromTheme(theme?: ModalThemeSlice): string {
  const on = theme?.root?.show?.on;
  if (!on) return DEFAULT_BACKDROP;
  const stripped = on.replace(/\bflex\b/g, "").trim();
  return stripped || DEFAULT_BACKDROP;
}

function shellZIndexClass(theme?: ModalThemeSlice): string {
  const base = theme?.root?.base ?? "";
  if (/\bz-\[\d+\]/.test(base)) {
    const match = base.match(/\bz-\[\d+\]/);
    return match?.[0] ?? "z-50";
  }
  if (/\bz-\d+/.test(base)) {
    const match = base.match(/\bz-\d+/);
    return match?.[0] ?? "z-50";
  }
  return "z-[120]";
}

type Props = {
  show: boolean;
  onClose: () => void;
  theme?: ModalThemeSlice;
  size?: ModalSize;
  dismissible?: boolean;
  mobileSheet?: boolean;
  backdropClassName?: string;
  panelClassName?: string;
  panelStyle?: CSSProperties;
  children: ReactNode;
};

/** Capa de modal con backdrop y panel animados por separado (misma transición en toda la app). */
export function CeTransitionModalShell({
  show,
  onClose,
  theme,
  size = "2xl",
  dismissible = true,
  mobileSheet = false,
  backdropClassName,
  panelClassName,
  panelStyle,
  children,
}: Props) {
  const titleId = useId();
  const [headerId, setHeaderId] = useState<string | undefined>(titleId);
  const { displayed, animateIn } = useModalTransition(show);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!displayed) return;

    lockBodyScroll();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissible) onCloseRef.current();
    }

    document.addEventListener("keydown", onKey);

    return () => {
      unlockBodyScroll();
      document.removeEventListener("keydown", onKey);
    };
  }, [displayed, dismissible]);

  if (!displayed) return null;

  const backdropClass =
    backdropClassName ?? backdropClassesFromTheme(theme);
  const panelInner = theme?.content?.inner ?? DEFAULT_PANEL_INNER;
  const zIndexClass = shellZIndexClass(theme);

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} overflow-hidden`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
    >
      <button
        type="button"
        className={`absolute inset-0 transition-opacity duration-300 ease-out motion-reduce:transition-none ${backdropClass} ${backdropTransitionClasses(animateIn)}`}
        aria-label="Cerrar"
        onClick={() => dismissible && onClose()}
      />
      <div className="flex h-full min-h-0 w-full items-end justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] sm:items-center sm:p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={headerId}
          className={`relative w-full ${MODAL_SIZE_CLASSES[size]} transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${panelInner} ${panelTransitionClasses(animateIn, mobileSheet)} ${panelClassName ?? ""}`}
          style={panelStyle}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <ModalContext.Provider
            value={{
              theme,
              dismissible,
              onClose,
              setHeaderId,
              popup: false,
            }}
          >
            {children}
          </ModalContext.Provider>
        </div>
      </div>
    </div>,
    document.body,
  );
}
