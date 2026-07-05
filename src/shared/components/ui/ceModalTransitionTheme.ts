const TRANSITION_BACKDROP =
  "transition-opacity duration-300 ease-out motion-reduce:transition-none";

const TRANSITION_PANEL =
  "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

export function backdropTransitionClasses(animateIn: boolean) {
  return animateIn ? "opacity-100" : "opacity-0";
}

export function panelTransitionClasses(
  animateIn: boolean,
  mobileSheet = false,
) {
  if (mobileSheet) {
    return animateIn
      ? "translate-y-0 opacity-100 sm:translate-y-0 sm:scale-100 sm:opacity-100"
      : "translate-y-full opacity-100 sm:translate-y-0 sm:scale-95 sm:opacity-0";
  }
  return animateIn
    ? "translate-y-0 scale-100 opacity-100"
    : "translate-y-4 scale-95 opacity-0 sm:translate-y-2";
}

type ModalThemeSlice = {
  root?: {
    base?: string;
    show?: { on?: string; off?: string };
    [key: string]: unknown;
  };
  content?: {
    base?: string;
    inner?: string;
  };
  [key: string]: unknown;
};

export function mergeFlowbiteModalTheme(
  baseTheme: ModalThemeSlice | undefined,
  animateIn: boolean,
  options?: { mobileSheet?: boolean },
): ModalThemeSlice {
  const mobileSheet = options?.mobileSheet ?? false;
  const root = baseTheme?.root ?? {};
  const show = root.show ?? {};
  const onClasses = show.on ?? "flex bg-gray-900/50 dark:bg-gray-900/80";

  return {
    ...baseTheme,
    root: {
      ...root,
      base: [root.base, TRANSITION_BACKDROP].filter(Boolean).join(" "),
      show: {
        ...show,
        on: [onClasses, TRANSITION_BACKDROP, backdropTransitionClasses(animateIn)]
          .filter(Boolean)
          .join(" "),
      },
    },
    content: {
      ...baseTheme?.content,
      base: [baseTheme?.content?.base, TRANSITION_PANEL].filter(Boolean).join(" "),
      inner: [
        baseTheme?.content?.inner,
        TRANSITION_PANEL,
        panelTransitionClasses(animateIn, mobileSheet),
      ]
        .filter(Boolean)
        .join(" "),
    },
  };
}
