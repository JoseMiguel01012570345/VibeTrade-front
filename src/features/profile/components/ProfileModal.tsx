import { ModalBody, ModalFooter, ModalHeader } from "flowbite-react";
import type { ReactNode } from "react";
import { CeTransitionModalShell } from "@shared/components/ui";

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

const PROFILE_MODAL_THEME = {
  content: {
    inner: "vt-profile-modal-panel",
  },
  root: {
    show: {
      on: "flex vt-modal-backdrop-btn",
    },
  },
} as const;

type Props = Readonly<{
  show: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  bodyClassName?: string;
}>;

export function ProfileModal({
  show,
  onClose,
  title,
  children,
  footer,
  size = "2xl",
  bodyClassName,
}: Props) {
  return (
    <CeTransitionModalShell
      show={show}
      onClose={onClose}
      size={size}
      theme={PROFILE_MODAL_THEME}
    >
      <ModalHeader className="vt-profile-modal-header border-b-0 dark:border-b-0">
        {title}
      </ModalHeader>
      <ModalBody className={bodyClassName ?? "vt-profile-modal-body"}>
        {children}
      </ModalBody>
      {footer ? (
        <ModalFooter className="vt-profile-modal-footer border-t-0 dark:border-t-0">
          {footer}
        </ModalFooter>
      ) : null}
    </CeTransitionModalShell>
  );
}
