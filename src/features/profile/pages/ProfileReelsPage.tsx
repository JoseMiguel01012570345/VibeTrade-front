import { Save } from 'lucide-react'

type Props = {
  savedIds: string[]
  reelTitles: Record<string, string>
}

export function ProfileReelsPage({ savedIds, reelTitles }: Props) {
  return (
    <div className="vt-card vt-card-pad">
      <div className="vt-h2">Reels guardados</div>
      <div className="vt-muted mt-1.5">
        Reels guardados desde la barra lateral de la experiencia inmersiva.
      </div>
      <div className="vt-divider my-3" />
      {savedIds.length === 0 ? (
        <div className="vt-muted">Aún no guardaste Reels.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {savedIds.map((id) => (
            <div
              key={id}
              className="flex items-center gap-2.5 rounded-[14px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_45%,var(--surface))] px-3 py-2.5"
            >
              <Save size={16} aria-hidden />
              <div>
                <div className="font-black tracking-[-0.02em]">
                  {reelTitles[id] ?? id}
                </div>
                <div className="vt-muted">ID: {id}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
