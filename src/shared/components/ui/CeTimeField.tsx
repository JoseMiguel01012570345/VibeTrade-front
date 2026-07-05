import type { InputHTMLAttributes } from "react";
import { CeField } from "./CeField";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type" | "value" | "onChange">;

/** Campo hora (HH:mm) con etiqueta CeField; la referencia admin no incluye CeTimeField. */
export function CeTimeField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  className,
  ...rest
}: Props) {
  const fieldId = id ?? "ce-time-field";
  return (
    <CeField label={label} htmlFor={fieldId} error={error} className="min-w-[140px] flex-1">
      <input
        id={fieldId}
        type="time"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={
          className ??
          "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        }
        {...rest}
      />
    </CeField>
  );
}
