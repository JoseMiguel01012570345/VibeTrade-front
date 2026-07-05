import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import "../styles/auth.css";

type Props = Readonly<{
  title: string;
  subtitle?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
  className?: string;
  centered?: boolean;
}>;

export function AuthPageShell({
  title,
  subtitle,
  backLabel,
  onBack,
  headerExtra,
  children,
  className,
  centered = false,
}: Props) {
  return (
    <div className={cn("container vt-page vt-auth-page", className)}>
      <div
        className={cn(
          "vt-auth-page__inner flex flex-col gap-5",
          centered && "min-h-[calc(100dvh-2rem)] justify-center",
        )}
      >
        {onBack ? (
          <button
            type="button"
            className="vt-auth-back-btn self-start"
            onClick={onBack}
          >
            <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
            {backLabel ?? "Volver"}
          </button>
        ) : null}

        <header>
          <h1 className="vt-auth-title">{title}</h1>
          {subtitle ? <p className="vt-auth-subtitle">{subtitle}</p> : null}
          {headerExtra}
        </header>

        <div className="vt-auth-card">{children}</div>
      </div>
    </div>
  );
}

export function AuthFormField({
  label,
  icon: Icon,
  htmlFor,
  children,
}: Readonly<{
  label: string;
  icon?: LucideIcon;
  htmlFor?: string;
  children: ReactNode;
}>) {
  return (
    <label className="vt-auth-field" htmlFor={htmlFor}>
      <span className="vt-auth-field-label">
        {Icon ? <Icon size={14} strokeWidth={2.25} aria-hidden /> : null}
        {label}
      </span>
      {children}
    </label>
  );
}
