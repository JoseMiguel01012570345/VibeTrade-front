import { Camera } from 'lucide-react'
import { cn } from '@shared/lib/cn'
import { ProtectedMediaImg } from '@shared/components/media/ProtectedMediaImg'

type Props = {
  avatarUrl?: string
  fallbackLetter: string
  sizeClass: string
  title: string
  onPickClick?: () => void
  onPreviewClick?: () => void
  interactive?: boolean
}

export function UserAvatarBadge({
  avatarUrl,
  fallbackLetter,
  sizeClass,
  title,
  onPickClick,
  onPreviewClick,
  interactive,
}: Props) {
  const inner = (
    <>
      {avatarUrl ? (
        <ProtectedMediaImg
          src={avatarUrl}
          alt=""
          wrapperClassName="h-full w-full"
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-lg font-black text-white">{fallbackLetter}</span>
      )}
    </>
  )

  const shellClass = cn(
    'relative grid place-items-center overflow-hidden rounded-[18px] bg-gradient-to-br from-[var(--primary)] to-violet-600 text-white',
    sizeClass,
    interactive &&
      'ring-offset-2 transition hover:opacity-95 focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--primary)]',
  )

  if (interactive && onPickClick) {
    const canPreview = Boolean(avatarUrl) && Boolean(onPreviewClick)
    return (
      <div className={shellClass}>
        {inner}
        {canPreview ? (
          <>
            <span
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(2,6,23,0.18)] via-transparent to-transparent"
              aria-hidden
            />
            <button
              type="button"
              className="absolute inset-0 z-[1] cursor-zoom-in"
              onClick={() => onPreviewClick?.()}
              aria-label="Ver foto de perfil"
              title="Ver foto de perfil"
            />
            <button
              type="button"
              className={cn(
                'absolute bottom-1 right-1 z-[2] grid h-7 w-7 place-items-center rounded-full',
                'border border-white/25 bg-[rgba(2,6,23,0.45)] text-white backdrop-blur-[8px]',
                'hover:bg-[rgba(2,6,23,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              )}
              onClick={(e) => {
                e.stopPropagation()
                onPickClick()
              }}
              aria-label="Cambiar foto"
              title="Cambiar foto"
            >
              <Camera size={14} aria-hidden />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="absolute inset-0 z-[1]"
            onClick={onPickClick}
            aria-label={title}
            title={title}
          />
        )}
      </div>
    )
  }

  return <div className={shellClass}>{inner}</div>
}
