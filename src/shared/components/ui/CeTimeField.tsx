import type { InputHTMLAttributes } from "react";
import { cn } from "@shared/lib/cn";
import { CeField } from "./CeField";
import { VtTimeField } from "./VtTimeField";

const defaultInputClass =
  "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500";

const organicFieldLabelClass =
  "text-xs font-bold text-[var(--muted)]";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  variant?: "default" | "organic";
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "value" | "onChange">;

/** Campo hora (HH:mm) con etiqueta CeField; la referencia admin no incluye CeTimeField. */
export function CeTimeField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  variant = "default",
  className,
  ...rest
}: Props) {
  const fieldId = id ?? "ce-time-field";
  const organic = variant === "organic";

  if (organic) {
    return (
      <CeField
        label={label}
        htmlFor={fieldId}
        error={error}
        className={cn(
          "min-w-[140px] flex-1",
          "relative z-0 focus-within:z-[310]",
        )}
        labelClassName={organicFieldLabelClass}
      >
        <VtTimeField
          id={fieldId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          variant="organic"
          placeholder="Elegir hora"
          popoverZIndexClass="z-[300]"
          aria-label={label}
        />
      </CeField>
    );
  }

  const inputClass = className ?? defaultInputClass;

  return (
    <CeField
      label={label}
      htmlFor={fieldId}
      error={error}
      className="min-w-[140px] flex-1"
    >
      <input
        id={fieldId}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        {...rest}
      />
    </CeField>
  );
}
