/** Misma base que el botón atrás del chat (`vt-btn` + tokens de tema). */
export const backRowBtnClass =
  "vt-btn z-[2] shrink-0 text-[var(--text)]";

const offerHeroChromeTokens =
  "border-[color-mix(in_oklab,var(--border)_55%,transparent)] bg-[color-mix(in_oklab,var(--surface)_88%,transparent)] text-[var(--text)] shadow-[var(--shadow)] backdrop-blur-[10px] hover:bg-[var(--surface)]";

/** Botón atrás sobre imagen / mapa en la ficha de oferta. */
export const offerHeroChromeBtnClass = `pointer-events-auto vt-btn ${offerHeroChromeTokens}`;

/** Estilo coherente para el botón guardar (redondo) sobre el hero de oferta. */
export const offerHeroSaveBtnChromeClass = `pointer-events-auto ${offerHeroChromeTokens}`;
