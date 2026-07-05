import type { TextInput } from "flowbite-react";
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  ReactNode,
  SelectHTMLAttributes,
} from "react";
import type { Theme } from "./theme";

export type CeSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  error?: string;
  wrapperClassName?: string;
  panelMinWidthPx?: number;
};

export type CeSelectFieldProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "size">;

export type CeNativeSelectProps = {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "size">;

export type CeTextFieldProps = {
  id: string;
  label: string;
  error?: string;
} & Omit<ComponentProps<typeof TextInput>, "id" | "color"> &
  Partial<Pick<ComponentProps<typeof TextInput>, "color">>;

export type CeIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "danger";
  "aria-label": string;
};

export type CeFieldProps = {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  helperText?: ReactNode;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
};

export type CeThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">;
