import type { ChangeEvent } from "react";
import { CeSelect } from "./CeSelect";

export type VtSelectOption = Readonly<{
  value: string;
  label: string;
  disabled?: boolean;
}>;

type Props = Readonly<{
  value: string;
  onChange: (value: string) => void;
  options: VtSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  listClassName?: string;
  listPortal?: boolean;
  listPortalZIndexClass?: string;
  ariaLabel?: string;
  id?: string;
}>;

/** Wrapper de compatibilidad: delega en CeSelect (listbox + portal). */
export function VtSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  disabled = false,
  className,
  buttonClassName,
  id,
}: Props) {
  return (
    <CeSelect
      id={id}
      value={value}
      disabled={disabled}
      className={buttonClassName ?? className}
      wrapperClassName={className}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </CeSelect>
  );
}

export type CeSelectOption = VtSelectOption;
