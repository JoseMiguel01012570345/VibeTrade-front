/** Tema de modales del storefront (comentarios, checkout, etc.). */
export const STOREFRONT_MODAL_BACKDROP = "bg-slate-900/45 backdrop-blur-sm";

export const STOREFRONT_COMMENTS_MODAL_THEME = {
  root: {
    base: "fixed inset-0 z-[200] overflow-hidden",
  },
  content: {
    inner:
      "relative grid max-h-[calc(100dvh-1.5rem)] w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[20px] border border-[#e8e1da] bg-white text-slate-900 shadow-[0_24px_60px_rgba(33,37,41,0.18)] sm:max-h-[min(90dvh,640px)]",
  },
};

export const STOREFRONT_CHECKOUT_MODAL_THEME = {
  root: {
    base: "fixed inset-0 z-[90] overflow-hidden",
  },
  content: {
    inner:
      "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-[18px] bg-white shadow-2xl",
  },
};
