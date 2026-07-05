import { Save } from 'lucide-react'
import {
  profilePanelClass,
  profileSectionCardClass,
  profileSectionMutedClass,
  profileSectionTitleClass,
} from '@features/profile/logic/profileTabStyles'

type Props = {
  savedIds: string[]
  reelTitles: Record<string, string>
}

export function ProfileReelsPage({ savedIds, reelTitles }: Props) {
  return (
    <div className={profileSectionCardClass}>
      <div className={profileSectionTitleClass}>Reels guardados</div>
      <div className={`${profileSectionMutedClass} mt-1.5`}>
        Reels guardados desde la barra lateral de la experiencia inmersiva.
      </div>
      <div className="vt-divider my-3" />
      {savedIds.length === 0 ? (
        <div className={profileSectionMutedClass}>Aún no guardaste Reels.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {savedIds.map((id) => (
            <div
              key={id}
              className={`${profilePanelClass} flex items-center gap-2.5`}
            >
              <Save size={16} aria-hidden />
              <div>
                <div className="font-black tracking-[-0.02em]">
                  {reelTitles[id] ?? id}
                </div>
                <div className={profileSectionMutedClass}>ID: {id}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
