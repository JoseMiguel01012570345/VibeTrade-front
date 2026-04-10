import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import {
  fetchMediaObjectUrl,
  getCachedMediaObjectUrl,
  isProtectedMediaUrl,
} from '../../utils/media/mediaClient'

type ImgProps = Readonly<{
  src: string | undefined
  alt: string
  /** Clases del <img> (p. ej. object-cover, tamaño). */
  className?: string
  /** Clases del contenedor (p. ej. absolute inset-0, w-full). */
  wrapperClassName?: string
}>

/**
 * Imagen con spinner hasta que la URL esté lista (fetch + decode para /api/v1/media/…).
 */
export function ProtectedMediaImg({
  src,
  alt,
  className,
  wrapperClassName,
}: ImgProps) {
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(() => {
    if (!src) return undefined
    if (!isProtectedMediaUrl(src)) return src
    return getCachedMediaObjectUrl(src)
  })
  const [fetching, setFetching] = useState(() => {
    if (!src) return false
    if (!isProtectedMediaUrl(src)) return false
    return !getCachedMediaObjectUrl(src)
  })
  const [imgLoaded, setImgLoaded] = useState(() => {
    if (!src) return false
    if (!isProtectedMediaUrl(src)) return false
    return Boolean(getCachedMediaObjectUrl(src))
  })
  const [fetchFailed, setFetchFailed] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  /** Imágenes cacheadas pueden cargar antes de que `onLoad` se enlace; `complete` lo detecta. */
  function syncLoadedIfImageComplete() {
    queueMicrotask(() => {
      const el = imgRef.current
      if (el?.complete) setImgLoaded(true)
    })
  }

  useEffect(() => {
    setFetchFailed(false)
    if (!src) {
      setDisplaySrc(undefined)
      setFetching(false)
      setImgLoaded(false)
      return
    }
    if (!isProtectedMediaUrl(src)) {
      setDisplaySrc(src)
      setFetching(false)
      setImgLoaded(false)
      syncLoadedIfImageComplete()
      return
    }
    const cached = getCachedMediaObjectUrl(src)
    if (cached) {
      setDisplaySrc(cached)
      setFetching(false)
      setImgLoaded(true)
      return
    }
    setImgLoaded(false)
    setFetching(true)
    setDisplaySrc(undefined)
    let active = true
    void (async () => {
      try {
        const obj = await fetchMediaObjectUrl(src)
        if (active) {
          setDisplaySrc(obj)
          setFetching(false)
          setImgLoaded(false)
          syncLoadedIfImageComplete()
        }
      } catch {
        if (active) {
          setFetching(false)
          setFetchFailed(true)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [src])

  const showSpinner =
    !fetchFailed && (fetching || !displaySrc || (Boolean(displaySrc) && !imgLoaded))

  /**
   * Sin <img> el contenedor puede colapsar a 0×0: el overlay `absolute inset-0` hereda caja nula
   * y el loader se ve corrido. Reservamos tamaño con un bloque (mismas clases que la foto).
   */
  const classStr = className ?? ''
  const needsMinForMaxH32 =
    /\bmax-h-32\b/.test(classStr) &&
    !/\bh-\d|h-\[|h-full|min-h-/.test(classStr)
  const showSizingPlaceholder = Boolean(showSpinner && !displaySrc && src)

  return (
    <span className={cn('relative inline-block max-w-full', wrapperClassName)}>
      {displaySrc ? (
        <img
          ref={imgRef}
          src={displaySrc}
          alt={alt}
          className={cn(className, showSpinner && 'opacity-0')}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgLoaded(true)}
        />
      ) : showSizingPlaceholder ? (
        <span
          className={cn(
            className,
            'box-border block w-full bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))]',
            needsMinForMaxH32 && 'min-h-32',
          )}
          aria-hidden
        />
      ) : null}
      {showSpinner ? (
        <span
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]"
          aria-hidden
        >
          <Loader2 className="h-6 w-6 animate-spin text-[var(--muted)]" />
        </span>
      ) : null}
      {fetchFailed ? (
        <span className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center text-[10px] font-bold text-[var(--muted)]">
          Error
        </span>
      ) : null}
    </span>
  )
}

type AnchorProps = Readonly<{
  href: string
  className?: string
  children: React.ReactNode
}>

/**
 * Enlace a documento/imagen: spinner y sin abrir pestaña hasta tener blob URL lista.
 */
export function ProtectedMediaAnchor({ href, className, children }: AnchorProps) {
  const [resolved, setResolved] = useState<string>(() =>
    isProtectedMediaUrl(href) ? getCachedMediaObjectUrl(href) ?? '' : href,
  )
  const [loading, setLoading] = useState(
    () => isProtectedMediaUrl(href) && !getCachedMediaObjectUrl(href),
  )
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    if (!isProtectedMediaUrl(href)) {
      setResolved(href)
      setLoading(false)
      return
    }
    const cached = getCachedMediaObjectUrl(href)
    if (cached) {
      setResolved(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    setResolved('')
    let active = true
    void (async () => {
      try {
        const obj = await fetchMediaObjectUrl(href)
        if (active) {
          setResolved(obj)
          setLoading(false)
        }
      } catch {
        if (active) {
          setLoading(false)
          setFailed(true)
        }
      }
    })()
    return () => {
      active = false
    }
  }, [href])

  const ready = Boolean(resolved) && !loading && !failed

  if (failed) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--muted)]', className)}>
        {children}
        <span className="text-[10px]">(no disponible)</span>
      </span>
    )
  }

  return (
    <span className="relative inline-flex max-w-full items-center">
      <a
        href={ready ? resolved : '#'}
        target="_blank"
        rel="noreferrer"
        className={cn(className, !ready && 'pointer-events-none cursor-wait')}
        aria-busy={loading}
        onClick={(e) => {
          if (!ready) e.preventDefault()
        }}
      >
        {children}
      </a>
      {loading ? (
        <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" aria-hidden />
        </span>
      ) : null}
    </span>
  )
}
