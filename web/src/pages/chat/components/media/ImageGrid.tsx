import { cn } from '../../../../lib/cn'

export function ImageGrid({
  images,
  onOpen,
}: {
  images: { url: string }[]
  onOpen: (url: string) => void
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-2', images.length > 1 && 'grid-cols-2')}>
      {images.map((img, i) => (
        <button
          key={i}
          type="button"
          className="block w-full cursor-zoom-in overflow-hidden rounded-xl border border-[var(--border)] bg-[rgba(15,23,42,0.06)] p-0"
          data-chat-interactive
          onClick={() => onOpen(img.url)}
          aria-label={`Ampliar imagen ${i + 1}`}
        >
          <img
            src={img.url}
            alt=""
            loading="lazy"
            className={cn('block w-full object-cover', images.length > 1 ? 'h-[100px]' : 'h-[120px]')}
          />
        </button>
      ))}
    </div>
  )
}
