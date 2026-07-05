import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import { CeSpinner } from "@shared/components/ui";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = Readonly<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: "sm" | "md";
    loading?: boolean;
    children: ReactNode;
  }
>;

export function ProfileButton({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "vt-profile-btn",
        size === "sm" && "vt-profile-btn--sm",
        variant === "primary" && "vt-profile-btn--primary",
        variant === "secondary" && "vt-profile-btn--secondary",
        variant === "ghost" && "vt-profile-btn--ghost",
        variant === "danger" && "vt-profile-btn--danger",
        className,
      )}
      {...props}
    >
      {loading ? (
        <CeSpinner size="sm" aria-label="Procesando" className="shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
