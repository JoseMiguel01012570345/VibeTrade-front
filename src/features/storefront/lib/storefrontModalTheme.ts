/** Tema de modales del storefront (comentarios, checkout, etc.). */
export const STOREFRONT_MODAL_BACKDROP = "vt-modal-backdrop-btn";

export const STOREFRONT_COMMENTS_MODAL_THEME = {
  root: {
    base: "fixed inset-0 z-[200] overflow-hidden",
  },
  content: {
    inner:
      "relative grid max-h-[calc(100dvh-1.5rem)] w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow)] sm:max-h-[min(90dvh,640px)] transition-[background,border-color] duration-700 ease-out",
  },
};

export const STOREFRONT_CHECKOUT_MODAL_THEME = {
  root: {
    base: "fixed inset-0 z-[90] overflow-hidden",
  },
  content: {
    inner:
      "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow)]",
  },
};
