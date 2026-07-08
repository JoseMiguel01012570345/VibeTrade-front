import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ImgHTMLAttributes,
} from "react";
import { ImageLoadingShimmer } from "./ImageLoadingShimmer";
import { IMAGE_LOAD_TIMEOUT_MS } from "./imageLoadTimeout";
import { cn } from "@shared/lib/cn";
import "./ceImageLoading.css";

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
>;

function srcWithRetryAttempt(src: string, attempt: number): string {
  if (attempt <= 0) return src;
  const sep = src.includes("?") ? "&" : "?";
  return `${src}${sep}ceRetry=${attempt}`;
}

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
}: CeMediaImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const skipLoadAttemptResetRef = useRef(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const fetchSrc = src ? srcWithRetryAttempt(src, loadAttempt) : "";

  const revealLoadedImage = useCallback(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    skipLoadAttemptResetRef.current = true;
    setLoadAttempt(0);
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    if (skipLoadAttemptResetRef.current) {
      skipLoadAttemptResetRef.current = false;
      return;
    }
    setLoaded(false);
  }, [loadAttempt]);

  useLayoutEffect(() => {
    if (loaded) return;
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      revealLoadedImage();
    }
  }, [fetchSrc, loaded, revealLoadedImage]);

  useEffect(() => {
    if (!src || loaded) return;
    const timer = window.setTimeout(() => {
      setLoadAttempt((attempt) => attempt + 1);
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [src, fetchSrc, loaded, timeoutMs]);

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
          key={loadAttempt}
          src={fetchSrc}
          alt={alt}
          loading={loading}
          decoding={decoding}
          draggable={draggable}
          style={style}
          width={width}
          height={height}
          fetchPriority={fetchPriority}
          className={cn(
            "ce-image-reveal relative z-[1] size-full object-cover",
            loaded ? "opacity-100" : "pointer-events-none opacity-0",
            imageClassName,
          )}
          onLoad={revealLoadedImage}
          onError={() => setLoadAttempt((attempt) => attempt + 1)}
        />
      ) : null}
    </div>
  );
}
