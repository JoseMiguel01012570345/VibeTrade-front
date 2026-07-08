import { Bell } from "lucide-react";
import { NotificationsPanel } from "../components/NotificationsPanel";
import {
  organicNotifIconClass,
  organicSearchPanelClass,
  organicShellTitleClass,
} from "@shared/styles/organicCardStyles";
import { cn } from "@shared/lib/cn";

export function NotificationsPage() {
  return (
    <div className="store-front-surface min-h-0 w-full flex-1 bg-[var(--bg)] pb-[calc(var(--vt-bottom-nav-clearance)+1.125rem)] text-[var(--text)]">
      <div className="mx-auto w-full max-w-[1140px] px-4 py-4 sm:py-6">
        <div className={`${organicSearchPanelClass} p-4 sm:p-5`}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className={cn(organicNotifIconClass, "h-10 w-10 rounded-2xl")}>
              <Bell size={20} aria-hidden />
            </span>
            <h1 className={`m-0 text-xl sm:text-2xl ${organicShellTitleClass}`}>
              Notificaciones
            </h1>
          </div>
          <NotificationsPanel />
        </div>
      </div>
    </div>
  );
}
