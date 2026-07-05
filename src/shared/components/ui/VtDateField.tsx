import { CeDateField } from "./CeDateField";

type Props = Readonly<{
  value: string;
  onChange: (isoDate: string) => void;
  min?: string;
  max?: string;
  allowEmpty?: boolean;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  popoverZIndexClass?: string;
  "aria-label"?: string;
  label?: string;
}>;

function parseMinMax(iso?: string): Date | undefined {
  if (!iso?.trim()) return undefined;
  const d = new Date(`${iso.trim()}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Wrapper de compatibilidad: delega en CeDateField (Flowbite Datepicker). */
export function VtDateField({
  value,
  onChange,
  min,
  max,
  id,
  disabled: _disabled,
  "aria-label": ariaLabel,
  label = "Fecha",
}: Props) {
  return (
    <CeDateField
      id={id}
      label={ariaLabel ?? label}
      value={value}
      onChange={onChange}
      minDate={parseMinMax(min)}
      maxDate={parseMinMax(max)}
    />
  );
}
