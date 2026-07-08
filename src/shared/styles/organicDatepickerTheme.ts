import { organicInputClass } from "./organicCardStyles";

/** Tema Flowbite Datepicker alineado al soft UI orgánico (popup por encima de la nav). */
export const organicDatepickerTheme = {
  popup: {
    root: {
      base: "absolute top-10 z-[300] block pt-2",
      inner:
        "vt-organic-datepicker-popup inline-block rounded-xl border border-[color-mix(in_oklab,var(--organic-cream)_50%,var(--border))] bg-[color-mix(in_oklab,var(--organic-cream-light)_92%,white)] p-4 shadow-[var(--organic-card-shadow)]",
    },
    header: {
      title:
        "px-2 py-3 text-center text-sm font-extrabold text-[var(--organic-forest)]",
      selectors: {
        button: {
          base: "rounded-lg border border-[color-mix(in_oklab,var(--organic-cream)_55%,var(--border))] bg-[color-mix(in_oklab,var(--organic-cream-light)_68%,var(--surface))] px-3 py-2 text-sm font-bold text-[var(--organic-forest)] hover:bg-[color-mix(in_oklab,white_55%,var(--organic-cream-light))] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--organic-sage)_30%,transparent)]",
        },
      },
    },
    footer: {
      button: {
        today:
          "w-full rounded-full bg-gradient-to-b from-[#3f7263] to-[#1a3a32] px-5 py-2 text-center text-sm font-bold text-[#f7f3ef] hover:brightness-105 focus:ring-2 focus:ring-[color-mix(in_oklab,var(--organic-sage)_35%,transparent)]",
        clear:
          "w-full rounded-full border border-[color-mix(in_oklab,var(--organic-cream)_55%,var(--border))] bg-[color-mix(in_oklab,var(--organic-cream-light)_65%,var(--surface))] px-5 py-2 text-center text-sm font-bold text-[var(--organic-forest)] hover:bg-[color-mix(in_oklab,white_50%,var(--organic-cream-light))]",
      },
    },
  },
  views: {
    days: {
      header: {
        title: "text-[var(--muted)]",
      },
      items: {
        item: {
          base: "block flex-1 cursor-pointer rounded-lg border-0 text-center text-sm font-semibold leading-9 text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--organic-cream)_45%,var(--surface))]",
          selected:
            "bg-[var(--organic-emerald)] text-white hover:bg-[var(--organic-forest)]",
          disabled: "text-[var(--muted)] opacity-40",
        },
      },
    },
    months: {
      items: {
        item: {
          base: "block flex-1 cursor-pointer rounded-lg border-0 text-center text-sm font-semibold leading-9 text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--organic-cream)_45%,var(--surface))]",
          selected:
            "bg-[var(--organic-emerald)] text-white hover:bg-[var(--organic-forest)]",
          disabled: "text-[var(--muted)] opacity-40",
        },
      },
    },
    years: {
      items: {
        item: {
          base: "block flex-1 cursor-pointer rounded-lg border-0 text-center text-sm font-semibold leading-9 text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--organic-cream)_45%,var(--surface))]",
          selected:
            "bg-[var(--organic-emerald)] text-white hover:bg-[var(--organic-forest)]",
          disabled: "text-[var(--muted)] opacity-40",
        },
      },
    },
    decades: {
      items: {
        item: {
          base: "block flex-1 cursor-pointer rounded-lg border-0 text-center text-sm font-semibold leading-9 text-[var(--text)] hover:bg-[color-mix(in_oklab,var(--organic-cream)_45%,var(--surface))]",
          selected:
            "bg-[var(--organic-emerald)] text-white hover:bg-[var(--organic-forest)]",
          disabled: "text-[var(--muted)] opacity-40",
        },
      },
    },
  },
  root: {
    input: {
      field: {
        input: {
          base: `${organicInputClass} block w-full disabled:cursor-not-allowed disabled:opacity-50`,
          sizes: {
            md: "p-2.5 text-sm",
          },
          colors: {
            gray: "text-[var(--text)] placeholder-[var(--muted)] focus:border-[color-mix(in_oklab,var(--organic-emerald)_45%,var(--border))] focus:ring-[color-mix(in_oklab,var(--organic-sage)_20%,transparent)]",
          },
          withIcon: {
            on: "pl-10",
          },
        },
        icon: {
          svg: "h-5 w-5 text-[var(--organic-emerald)]",
        },
      },
    },
  },
} as const;
