import { cn } from "@shared/lib/cn";

export const profileSectionCardClass = "vt-profile-card";

export const profileSectionTitleClass = "vt-profile-section-title";

export const profileSectionMutedClass = "vt-profile-muted";

export const profileGhostBtnClass = "vt-profile-btn vt-profile-btn--ghost";

export const profilePrimaryBtnClass = "vt-profile-btn vt-profile-btn--primary";

export const profileSecondaryBtnClass = "vt-profile-btn vt-profile-btn--secondary";

export const profileFieldLabelClass = "vt-profile-field-label";

export const profileInputClass = "vt-input vt-profile-input";

export const profileDividerClass = "vt-profile-divider";

export const profilePanelClass = "vt-profile-panel";

export function profileTabClass(active: boolean): string {
  return cn("vt-profile-nav-link", active && "vt-profile-nav-link--active");
}
