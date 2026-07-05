import { cn } from "@shared/lib/cn"

export function ImageGrid({
  images,
  onOpen,
}: {
  images: { url: string }[]
  onOpen: (url: string) => void
}) {
  return (
    <div className={cn('grid grid-cols-1 gap-1.5', images.length > 1 && 'grid-cols-2')}>
      {images.map((img, i) => (
        <button
          key={i}
          type="button"
          className="block w-full cursor-zoom-in overflow-hidden rounded-lg border border-[var(--border)] bg-[rgba(15,23,42,0.06)] p-0"
          data-chat-interactive
          onClick={() => onOpen(img.url)}
          aria-label={`Ampliar imagen ${i + 1}`}
        >
          <img
            src={img.url}
            alt=""
            loading="lazy"
            className={cn(
              'block aspect-square w-full object-cover',
              images.length === 1 && 'max-h-56',
            )}
          />
        </button>
      ))}
    </div>
  )
}
