import { Bookmark, Clapperboard, Store, User } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@shared/lib/cn";
import {
  profileSectionPath,
  type ProfileSection,
} from "@features/profile/logic/profilePaths";

type NavItem = {
  section: ProfileSection;
  label: string;
  icon: typeof User;
};

type Props = Readonly<{
  userId: string;
  tab: ProfileSection;
  isMe: boolean;
  showStoresTab: boolean;
}>;

export function ProfileSidebar({ userId, tab, isMe, showStoresTab }: Props) {
  const items: NavItem[] = [{ section: "account", label: "Perfil", icon: User }];

  if (isMe) {
    items.push(
      { section: "saved", label: "Guardados", icon: Bookmark },
      { section: "reels", label: "Mis reels", icon: Clapperboard },
    );
  }

  if (showStoresTab) {
    items.push({ section: "stores", label: "Tiendas", icon: Store });
  }

  return (
    <nav aria-label="Secciones del perfil" className="vt-profile-sidebar">
      <p className="vt-profile-sidebar__label">Menú</p>
      <ul className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-col md:gap-1.5 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        {items.map(({ section, label, icon: Icon }) => (
          <li key={section} className="shrink-0 md:shrink md:w-full">
            <Link
              to={profileSectionPath(userId, section)}
              className={cn(
                "vt-profile-nav-link",
                tab === section && "vt-profile-nav-link--active",
              )}
              aria-current={tab === section ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={2.25} aria-hidden />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
