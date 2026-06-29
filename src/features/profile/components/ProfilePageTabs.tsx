import { Link } from 'react-router-dom'
import { cn } from '@shared/lib/cn'
import {
  profileSectionPath,
  type ProfileSection,
} from '@features/profile/model/profilePaths'

type Props = {
  userId: string
  tab: ProfileSection
  isMe: boolean
  showStoresTab: boolean
}

const tabLinkClass =
  'min-w-[calc(50%-6px)] flex-1 cursor-pointer rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-center font-black no-underline sm:min-w-0'

function tabClass(active: boolean) {
  return cn(
    tabLinkClass,
    active &&
      'border-[color-mix(in_oklab,var(--primary)_30%,var(--border))] bg-[color-mix(in_oklab,var(--primary)_10%,var(--surface))]',
  )
}

export function ProfilePageTabs({ userId, tab, isMe, showStoresTab }: Props) {
  return (
    <div className="flex flex-wrap gap-2.5">
      <Link to={profileSectionPath(userId, 'account')} className={tabClass(tab === 'account')}>
        Cuenta
      </Link>
      {isMe ? (
        <Link to={profileSectionPath(userId, 'reels')} className={tabClass(tab === 'reels')}>
          Mis Reels
        </Link>
      ) : null}
      {isMe ? (
        <Link to={profileSectionPath(userId, 'saved')} className={tabClass(tab === 'saved')}>
          Guardados
        </Link>
      ) : null}
      {showStoresTab ? (
        <Link to={profileSectionPath(userId, 'stores')} className={tabClass(tab === 'stores')}>
          Tiendas
        </Link>
      ) : null}
    </div>
  )
}
