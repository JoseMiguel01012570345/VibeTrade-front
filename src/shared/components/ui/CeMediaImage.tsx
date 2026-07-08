import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";
import { ImageLoadingShimmer } from "./ImageLoadingShimmer";
import { IMAGE_LOAD_TIMEOUT_MS } from "./imageLoadTimeout";
import { cn } from "@shared/lib/cn";
import "./ceImageLoading.css";

const MAX_LOAD_ATTEMPTS = 4;

type LoadState = {
  attempt: number;
  loaded: boolean;
};

export type CeMediaImageProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  timeoutMs?: number;
} & Pick<
  ImgHTMLAttributes<HTMLImageElement>,
  | "loading"
  | "decoding"
  | "draggable"
  | "style"
  | "width"
  | "height"
  | "fetchPriority"
  | "onLoad"
>;

function srcWithRetryAttempt(src: string, attempt: number): string {
  if (attempt <= 0) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}ceRetry=${attempt}`;
}

const initialLoadState: LoadState = { attempt: 0, loaded: false };

export function CeMediaImage({
  src,
  alt,
  className,
  imageClassName,
  timeoutMs = IMAGE_LOAD_TIMEOUT_MS,
  loading = "lazy",
  decoding = "async",
  draggable,
  style,
  width,
  height,
  fetchPriority,
  onLoad,
}: CeMediaImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const gaveUpRef = useRef(false);
  const layoutHandledSrcRef = useRef<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(initialLoadState);

  const fetchSrc = src ? srcWithRetryAttempt(src, loadState.attempt) : "";
  const { attempt: loadAttempt, loaded } = loadState;

  useEffect(() => {
    gaveUpRef.current = false;
    layoutHandledSrcRef.current = null;
    setLoadState(initialLoadState);
  }, [src]);

  /** Imágenes en caché: `onLoad` a veces no dispara; un solo chequeo por `fetchSrc`. */
  useLayoutEffect(() => {
    if (layoutHandledSrcRef.current === fetchSrc) return;
    const img = imgRef.current;
    if (!img?.complete || img.naturalWidth <= 0) return;
    layoutHandledSrcRef.current = fetchSrc;
    setLoadState((prev) => (prev.loaded ? prev : { ...prev, loaded: true }));
    onLoad?.({ currentTarget: img } as SyntheticEvent<HTMLImageElement>);
  }, [fetchSrc, onLoad]);

  useEffect(() => {
    if (!src || loaded || gaveUpRef.current) return;
    if (loadAttempt >= MAX_LOAD_ATTEMPTS - 1) return;

    const timer = window.setTimeout(() => {
      setLoadState((prev) => {
        if (prev.loaded || prev.attempt >= MAX_LOAD_ATTEMPTS - 1) return prev;
        return { attempt: prev.attempt + 1, loaded: false };
      });
    }, timeoutMs);

    return () => window.clearTimeout(timer);
  }, [src, fetchSrc, loaded, loadAttempt, timeoutMs]);

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    setLoadState((prev) => (prev.loaded ? prev : { ...prev, loaded: true }));
    onLoad?.(event);
  }

  function handleError() {
    if (gaveUpRef.current) return;

    setLoadState((prev) => {
      const nextAttempt = prev.attempt + 1;
      if (nextAttempt >= MAX_LOAD_ATTEMPTS) {
        gaveUpRef.current = true;
        layoutHandledSrcRef.current = fetchSrc;
        return { attempt: prev.attempt, loaded: true };
      }
      layoutHandledSrcRef.current = null;
      return { attempt: nextAttempt, loaded: false };
    });
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!loaded ? (
        <ImageLoadingShimmer
          key={`loading-${fetchSrc}`}
          className="absolute inset-0 z-0 size-full"
          aria-busy
          aria-label={alt}
          role="img"
        />
      ) : null}
      {src ? (
        <img
          ref={imgRef}
          src={fetchSrc}
          alt={alt}
          loading={loading}
          decoding={decoding}
          draggable={draggable}
          style={style}
          width={width}
          height={height}
          {...(fetchPriority ? { fetchpriority: fetchPriority } : {})}
          className={cn(
            "ce-image-reveal relative z-[1] size-full object-cover",
            loaded ? "opacity-100" : "pointer-events-none opacity-0",
            imageClassName,
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}
    </div>
  );
}
