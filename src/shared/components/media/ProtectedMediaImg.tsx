import { useEffect, useState } from "react";
import { cn } from "@shared/lib/cn";
import { CeSpinner } from "@shared/components/ui/CeSpinner";
import {
  fetchMediaObjectUrl,
  getCachedMediaObjectUrl,
  isProtectedMediaUrl,
} from "@shared/services/media/mediaClient";
import { CeProtectedMediaImage } from "./CeProtectedMediaImage";

type ImgProps = Readonly<{
  src: string | undefined;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  onImageLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
}>;

/** @deprecated Usar CeProtectedMediaImage; alias de compatibilidad. */
export function ProtectedMediaImg(props: ImgProps) {
  return <CeProtectedMediaImage {...props} />;
}

type AnchorProps = Readonly<{
  href: string;
  className?: string;
  children: React.ReactNode;
}>;

export function ProtectedMediaAnchor({ href, className, children }: AnchorProps) {
  const [resolved, setResolved] = useState<string>(() =>
    isProtectedMediaUrl(href) ? getCachedMediaObjectUrl(href) ?? "" : href,
  );
  const [loading, setLoading] = useState(
    () => isProtectedMediaUrl(href) && !getCachedMediaObjectUrl(href),
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!isProtectedMediaUrl(href)) {
      setResolved(href);
      setLoading(false);
      return;
    }
    const cached = getCachedMediaObjectUrl(href);
    if (cached) {
      setResolved(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    setResolved("");
    let active = true;
    void (async () => {
      try {
        const obj = await fetchMediaObjectUrl(href);
        if (active) {
          setResolved(obj);
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoading(false);
          setFailed(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [href]);

  const ready = Boolean(resolved) && !loading && !failed;

  if (failed) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--muted)]",
          className,
        )}
      >
        {children}
        <span className="text-[10px]">(no disponible)</span>
      </span>
    );
  }

  return (
    <span className="relative inline-flex max-w-full items-center">
      <a
        href={ready ? resolved : "#"}
        target="_blank"
        rel="noreferrer"
        className={cn(className, !ready && "pointer-events-none cursor-wait")}
        aria-busy={loading}
        onClick={(e) => {
          if (!ready) e.preventDefault();
        }}
      >
        {children}
      </a>
      {loading ? (
        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))]">
          <CeSpinner size="sm" aria-hidden />
        </span>
      ) : null}
    </span>
  );
}

export { CeProtectedMediaImage } from "./CeProtectedMediaImage";
