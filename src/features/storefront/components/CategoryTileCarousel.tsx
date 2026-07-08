import { useCallback, useEffect, useRef, useState } from "react";
import type { CategoryMeta } from "../logic/storefrontTypes";
import { ScrollArrowButton } from "./ScrollArrowButton";
import { CategoryTileLink } from "./CategoryTileLink";

export function CategoryTileCarousel({
  categories,
  hrefFor,
  ariaLabel,
  kind,
}: Readonly<{
  categories: CategoryMeta[];
  hrefFor: (category: CategoryMeta) => string;
  ariaLabel: string;
  kind: "product" | "service";
}>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({
    canLeft: false,
    canRight: false,
  });

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const canLeft = el.scrollLeft > 1;
    const canRight = el.scrollLeft < maxScroll - 1;
    setScrollState((prev) =>
      prev.canLeft === canLeft && prev.canRight === canRight
        ? prev
        : { canLeft, canRight },
    );
  }, []);

  const scrollBy = useCallback((direction: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.8, 200);
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const win = typeof globalThis === "undefined" ? null : globalThis;
    win?.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      win?.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, categories.length]);

  return (
    <div className="relative -mx-4 sm:mx-0">
      <div
        ref={scrollerRef}
        className="store-no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 pt-0.5 [-webkit-overflow-scrolling:touch] sm:gap-4 sm:px-0"
        role="list"
        aria-label={ariaLabel}
      >
        {categories.map((category) => (
          <div
            key={category.id}
            className="shrink-0"
            role="listitem"
          >
            <CategoryTileLink
              label={category.label}
              to={hrefFor(category)}
              kind={kind}
            />
          </div>
        ))}
      </div>

      {scrollState.canLeft ? (
        <ScrollArrowButton
          direction="left"
          onClick={() => scrollBy("left")}
          aria-label="Desplazar categorías a la izquierda"
        />
      ) : null}

      {scrollState.canRight ? (
        <ScrollArrowButton
          direction="right"
          onClick={() => scrollBy("right")}
          aria-label="Desplazar categorías a la derecha"
        />
      ) : null}
    </div>
  );
}
