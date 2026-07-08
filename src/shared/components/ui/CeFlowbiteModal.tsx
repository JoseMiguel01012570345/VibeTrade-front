import type { ReactNode, CSSProperties } from "react";
import { CeTransitionModalShell } from "./CeTransitionModalShell";

type ModalSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl";

type ModalThemeSlice = {
  root?: {
    base?: string;
    show?: { on?: string; off?: string };
    [key: string]: unknown;
  };
  content?: { inner?: string };
  header?: Record<string, unknown>;
  body?: Record<string, unknown>;
  footer?: Record<string, unknown>;
  [key: string]: unknown;
};

type Props = Readonly<{
  show: boolean;
  onClose: () => void;
  theme?: ModalThemeSlice;
  size?: ModalSize;
  dismissible?: boolean;
  children: ReactNode;
  mobileSheet?: boolean;
  backdropClassName?: string;
  panelClassName?: string;
  panelStyle?: CSSProperties;
}>;

/** Shell de modal con transición para layouts Flowbite o personalizados. */
export function CeFlowbiteModal({
  show,
  onClose,
  theme,
  size = "2xl",
  dismissible = true,
  children,
  mobileSheet = false,
  backdropClassName,
  panelClassName,
  panelStyle,
}: Props) {
  return (
    <CeTransitionModalShell
      show={show}
      onClose={onClose}
      theme={theme}
      size={size}
      dismissible={dismissible}
      mobileSheet={mobileSheet}
      backdropClassName={backdropClassName}
      panelClassName={panelClassName}
      panelStyle={panelStyle}
    >
      {children}
    </CeTransitionModalShell>
  );
}

export { ModalBody, ModalFooter, ModalHeader } from "flowbite-react";
