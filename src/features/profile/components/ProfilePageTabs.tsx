import { Link } from 'react-router-dom'
import {
  profileSectionPath,
  type ProfileSection,
} from '@features/profile/logic/profilePaths'
import { profileTabClass } from '@features/profile/logic/profileTabStyles'

type Props = {
  userId: string
  tab: ProfileSection
  isMe: boolean
  showStoresTab: boolean
}

export function ProfilePageTabs({ userId, tab, isMe, showStoresTab }: Props) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Link to={profileSectionPath(userId, 'account')} className={profileTabClass(tab === 'account')}>
        Cuenta
      </Link>
      {isMe ? (
        <Link to={profileSectionPath(userId, 'reels')} className={profileTabClass(tab === 'reels')}>
          Mis Reels
        </Link>
      ) : null}
      {isMe ? (
        <Link to={profileSectionPath(userId, 'saved')} className={profileTabClass(tab === 'saved')}>
          Guardados
        </Link>
      ) : null}
      {showStoresTab ? (
        <Link to={profileSectionPath(userId, 'stores')} className={profileTabClass(tab === 'stores')}>
          Tiendas
        </Link>
      ) : null}
    </div>
  )
}
