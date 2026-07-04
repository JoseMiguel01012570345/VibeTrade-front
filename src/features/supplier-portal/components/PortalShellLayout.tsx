import { useState, type ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import { MenuIcon } from "./ProveedorUi";

export function PortalShellLayout({
  title,
  mobileSubtitle,
  renderSidebar,
  footer,
  children,
}: {
  title: string;
  mobileSubtitle?: string;
  renderSidebar: (onNavClick: () => void) => ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const offcanvasId = "portal-nav-offcanvas";
  const closeMenu = () => setMenuOpen(false);
  const sidebar = renderSidebar(closeMenu);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] min-h-0 w-full overflow-hidden bg-[#F9FAFB] dark:bg-gray-950">
      <aside className="relative hidden h-full min-h-0 w-64 shrink-0 overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950 md:flex">
        {sidebar}
      </aside>

      <button
        type="button"
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-[48] bg-black/40 transition-opacity duration-200 md:hidden",
          menuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        id={offcanvasId}
        className={cn(
          "fixed bottom-0 left-0 top-0 z-[50] flex w-[min(100vw,280px)] max-w-full flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 ease-out dark:border-gray-800 dark:bg-gray-950 md:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full",
          menuOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!menuOpen}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Menú
          </span>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-900"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {sidebar}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className="z-[40] flex shrink-0 items-center gap-3 border-b border-gray-200/90 bg-white/95 px-3 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 sm:px-4"
          style={{ paddingTop: "max(0.65rem, env(safe-area-inset-top, 0px))" }}
        >
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 md:hidden dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            aria-expanded={menuOpen}
            aria-controls={offcanvasId}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
              {title}
            </p>
            {mobileSubtitle ? (
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {mobileSubtitle}
              </p>
            ) : null}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          {children}
          {footer ? (
            <footer className="mt-8 border-t border-gray-200 pt-4 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
              {footer}
            </footer>
          ) : null}
        </main>
      </div>
    </div>
  );
}
