import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { Download, Filter, Loader2, LogOut, Menu } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { VtDateField } from "@shared/components/ui/VtDateField";

export { Menu as MenuIcon, Download as IconDownload, Filter as IconFilterFunnel, LogOut as IconLogout };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  color?: "gray" | "primary";
  outline?: boolean;
};

export function CeButton({
  color = "primary",
  outline = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        outline
          ? "border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          : color === "gray"
            ? "border border-gray-200 bg-gray-100 text-gray-800 hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            : "border-0 bg-[#0f6b4f] text-white hover:bg-[#0c5640] dark:bg-[#0f6b4f] dark:hover:bg-[#0d5c44]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function CeSpinner({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <Loader2
      className={cn("animate-spin text-gray-500", size === "sm" ? "h-4 w-4" : "h-6 w-6")}
      aria-hidden
    />
  );
}

export function CeTextField({
  id,
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <input
        id={id}
        className={cn(
          "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-[#0f6b4f] focus:ring-1 focus:ring-[#0f6b4f] dark:border-gray-600 dark:bg-gray-800 dark:text-white",
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function CeNativeSelect({
  id,
  label,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <select
        id={id}
        className={cn(
          "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none focus:border-[#0f6b4f] focus:ring-1 focus:ring-[#0f6b4f] dark:border-gray-600 dark:bg-gray-800 dark:text-white",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function CeSelect({
  id,
  value,
  onChange,
  className,
  wrapperClassName,
  children,
}: {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  wrapperClassName?: string;
  children: ReactNode;
}) {
  return (
    <span className={wrapperClassName}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className={cn(
          "appearance-none rounded-lg border border-gray-200 bg-white text-sm text-gray-900 shadow-sm outline-none focus:border-[#0f6b4f] focus:ring-1 focus:ring-[#0f6b4f] dark:border-gray-600 dark:bg-gray-800 dark:text-white",
          className,
        )}
      >
        {children}
      </select>
    </span>
  );
}

export function CeDateField({
  id,
  label,
  value,
  onChange,
  minDate,
  maxDate,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (ymd: string) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
      <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <VtDateField
        id={id}
        value={value}
        onChange={onChange}
        allowEmpty
        min={minDate ? minDate.toISOString().slice(0, 10) : undefined}
        max={maxDate ? maxDate.toISOString().slice(0, 10) : undefined}
        buttonClassName="rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
      />
    </label>
  );
}

export function CeModal({
  show,
  onClose,
  title,
  size = "lg",
  footer,
  children,
}: {
  show: boolean;
  onClose: () => void;
  title: ReactNode;
  size?: "lg" | "2xl";
  footer?: ReactNode;
  children: ReactNode;
}) {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "max-h-[90dvh] w-full overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900",
          size === "2xl" ? "max-w-3xl" : "max-w-lg",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function CeMediaImage({
  src,
  alt,
  className,
  imageClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <span className={className}>
      <img src={src} alt={alt} className={imageClassName ?? "h-full w-full object-cover"} />
    </span>
  );
}
