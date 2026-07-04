import {
  useCallback,
  useEffect,
  useState,
  type AnimationEvent,
  type ReactNode,
} from "react";
import { ProtectedMediaImg } from "@shared/components/media/ProtectedMediaImg";
import { PROMO_ROTATE_MS, PROMO_TRANSITION_MS } from "../logic/catalogPageConfig";
import type {
  BannerSliderProps,
  BannerSliderSlide,
  BannerSliderSlideState,
} from "../types/bannerSlider";

export type {
  BannerSliderProps,
  BannerSliderSlide,
} from "../types/bannerSlider";

/**
 * Carrusel de banners que reutiliza las animaciones CSS `ce-promo-*` definidas en `index.css`.
 * Auto-rotación con pausa en hover y respeto a `prefers-reduced-motion`.
 */
export function BannerSlider({
  slides,
  ariaLabel,
  onSlideClick,
  imgClassName,
  slideClassName,
  rotateMs = PROMO_ROTATE_MS,
  showDots,
}: BannerSliderProps) {
  const [slide, setSlide] = useState<BannerSliderSlideState>({
    current: 0,
    outgoing: null,
  });
  const [hoverPaused, setHoverPaused] = useState(false);

  const reduceMotion =
    typeof globalThis !== "undefined" &&
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  useEffect(() => {
    setSlide({ current: 0, outgoing: null });
  }, [slides.length]);

  const finishTransition = useCallback((ev: AnimationEvent<HTMLDivElement>) => {
    const target = ev.target as HTMLElement | null;
    if (!target?.classList.contains("ce-promo-enter-from-left")) return;
    if (!ev.animationName.includes("ce-promo-enter-from-left")) return;
    setSlide((p) => (p.outgoing === null ? p : { ...p, outgoing: null }));
  }, []);

  useEffect(() => {
    if (slide.outgoing === null) return;
    const id = globalThis.setTimeout(() => {
      setSlide((p) => (p.outgoing === null ? p : { ...p, outgoing: null }));
    }, PROMO_TRANSITION_MS + 200);
    return () => globalThis.clearTimeout(id);
  }, [slide.outgoing, slide.current]);

  useEffect(() => {
    if (slides.length <= 1) return;
    if (hoverPaused) return;
    const id = globalThis.setInterval(() => {
      setSlide((p) => {
        const len = slides.length;
        if (reduceMotion) {
          return { current: (p.current + 1) % len, outgoing: null };
        }
        if (p.outgoing != null) return p;
        return { outgoing: p.current, current: (p.current + 1) % len };
      });
    }, rotateMs);
    return () => globalThis.clearInterval(id);
  }, [slides.length, hoverPaused, reduceMotion, rotateMs]);

  function goTo(next: number): void {
    if (reduceMotion || slides.length <= 1) {
      setSlide({ current: next, outgoing: null });
      return;
    }
    setSlide((p) => {
      if (next === p.current || p.outgoing != null) return p;
      return { outgoing: p.current, current: next };
    });
  }

  if (slides.length === 0) return null;

  const renderSlide = (s: BannerSliderSlide): ReactNode => {
    const img = (
      <ProtectedMediaImg
        src={s.src}
        alt={s.alt ?? ""}
        className={`rounded-[28px] ${imgClassName ?? ""}`.trim()}
        wrapperClassName="block h-full w-full"
      />
    );
    if (onSlideClick) {
      return (
        <button
          type="button"
          onClick={onSlideClick}
          className="block h-full w-full text-left"
          aria-label={s.alt ?? ariaLabel}
        >
          {img}
        </button>
      );
    }
    return img;
  };

  const renderDots = showDots ?? slides.length > 1;

  return (
    <div
      className="relative"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div
        className={`relative w-full ${slideClassName ?? ""}`.trim()}
        role="list"
        aria-label={ariaLabel}
        aria-live="polite"
        aria-atomic="true"
        onAnimationEnd={finishTransition}
      >
        {slides.length === 1 || reduceMotion ? (
          <div className="min-w-0 h-full" role="listitem">
            {renderSlide(slides[slide.current])}
          </div>
        ) : (
          <>
            <div
              className={`absolute inset-0 z-[1] min-w-0 ${
                slide.outgoing === null
                  ? "ce-promo-at-rest"
                  : "ce-promo-enter-from-left"
              }`}
              role="listitem"
            >
              {renderSlide(slides[slide.current])}
            </div>
            {slide.outgoing === null ? null : (
              <div
                key={`out-${slide.outgoing}-${slide.current}`}
                className="absolute inset-0 z-[2] min-w-0 ce-promo-exit-right"
                aria-hidden
              >
                {renderSlide(slides[slide.outgoing])}
              </div>
            )}
            <div className="invisible" aria-hidden>
              {renderSlide(slides[slide.current])}
            </div>
          </>
        )}
      </div>

      {renderDots ? (
        <nav
          className="mt-3 flex justify-center gap-2"
          aria-label={`Paso de ${ariaLabel}`}
        >
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-current={i === slide.current ? "true" : undefined}
              className={`h-2.5 rounded-full transition-all duration-200 ${
                i === slide.current
                  ? "w-8 bg-emerald-600"
                  : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
              onClick={() => goTo(i)}
              aria-label={`Ver slide ${i + 1}`}
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
