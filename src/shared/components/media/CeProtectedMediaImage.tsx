import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@shared/lib/cn";
import { ImageLoadingShimmer } from "@shared/components/ui/ImageLoadingShimmer";
import "@shared/components/ui/ceImageLoading.css";
import {
  fetchMediaObjectUrl,
  getCachedMediaObjectUrl,
  isProtectedMediaUrl,
} from "@shared/services/media/mediaClient";
import { CeMediaImage } from "@shared/components/ui/CeMediaImage";

type ImgProps = Readonly<{
  src: string | undefined;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  onImageLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
}>;

/**
 * Imagen con shimmer: URLs públicas vía CeMediaImage; /api/v1/media/ con fetch autenticado.
 */
export function CeProtectedMediaImage({
  src,
  alt,
  className,
  wrapperClassName,
  onImageLoad,
}: ImgProps) {
  if (!src) {
    return (
      <span className={cn("relative inline-block max-w-full", wrapperClassName)} aria-hidden />
    );
  }

  if (!isProtectedMediaUrl(src)) {
    return (
      <span className={cn("relative inline-block max-w-full", wrapperClassName)}>
        <CeMediaImage
          src={src}
          alt={alt}
          className="size-full"
          imageClassName={className}
          onLoad={onImageLoad}
        />
      </span>
    );
  }

  return (
    <ProtectedMediaBlobImage
      src={src}
      alt={alt}
      className={className}
      wrapperClassName={wrapperClassName}
      onImageLoad={onImageLoad}
    />
  );
}

function ProtectedMediaBlobImage({
  src,
  alt,
  className,
  wrapperClassName,
  onImageLoad,
}: Readonly<{
  src: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  onImageLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
}>) {
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(() =>
    getCachedMediaObjectUrl(src),
  );
  const [fetching, setFetching] = useState(() => !getCachedMediaObjectUrl(src));
  const [imgLoaded, setImgLoaded] = useState(() => Boolean(getCachedMediaObjectUrl(src)));
  const [fetchFailed, setFetchFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const syncLoadedIfImageComplete = useCallback(() => {
    queueMicrotask(() => {
      const el = imgRef.current;
      if (el?.complete && el.naturalWidth > 0) {
        setImgLoaded(true);
        onImageLoad?.({ currentTarget: el } as React.SyntheticEvent<HTMLImageElement>);
      }
    });
  }, [onImageLoad]);

  useEffect(() => {
    setFetchFailed(false);
    const cached = getCachedMediaObjectUrl(src);
    if (cached) {
      setDisplaySrc(cached);
      setFetching(false);
      setImgLoaded(true);
      return;
    }
    setImgLoaded(false);
    setFetching(true);
    setDisplaySrc(undefined);
    let active = true;
    void (async () => {
      try {
        const obj = await fetchMediaObjectUrl(src);
        if (active) {
          setDisplaySrc(obj);
          setFetching(false);
          setImgLoaded(false);
          syncLoadedIfImageComplete();
        }
      } catch {
        if (active) {
          setFetching(false);
          setFetchFailed(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [src, syncLoadedIfImageComplete]);

  useLayoutEffect(() => {
    syncLoadedIfImageComplete();
  }, [displaySrc, syncLoadedIfImageComplete]);

  const showShimmer =
    !fetchFailed && (fetching || !displaySrc || (Boolean(displaySrc) && !imgLoaded));

  const classStr = className ?? "";
  const needsMinForMaxH32 =
    /\bmax-h-32\b/.test(classStr) && !/\bh-\d|h-\[|h-full|min-h-/.test(classStr);
  const showSizingPlaceholder = Boolean(showShimmer && !displaySrc);

  return (
    <span className={cn("relative inline-block max-w-full overflow-hidden", wrapperClassName)}>
      {showShimmer ? (
        <ImageLoadingShimmer
          className={cn(
            "absolute inset-0 z-0 size-full",
            showSizingPlaceholder && needsMinForMaxH32 && "min-h-32",
          )}
          aria-busy
          aria-label={alt}
          role="img"
        />
      ) : null}
      {displaySrc ? (
        <img
          ref={imgRef}
          src={displaySrc}
          alt={alt}
          className={cn(
            "ce-image-reveal relative z-[1]",
            className,
            imgLoaded ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onLoad={(event) => {
            setImgLoaded(true);
            onImageLoad?.(event);
          }}
          onError={() => setImgLoaded(true)}
        />
      ) : showSizingPlaceholder ? (
        <span
          className={cn(className, "relative z-[1] box-border block w-full", needsMinForMaxH32 && "min-h-32")}
          aria-hidden
        />
      ) : null}
      {fetchFailed ? (
        <span className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center text-[10px] font-bold text-[var(--muted)]">
          Error
        </span>
      ) : null}
    </span>
  );
}
