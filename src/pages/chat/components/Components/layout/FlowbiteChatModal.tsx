import type { ReactNode } from "react";
import type { ModalProps } from "flowbite-react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "flowbite-react";
import { cn } from "../../../../../lib/cn";

/** Modal Flowbite montado en `document.body` con z-index por encima del rail del chat (`z-[120]`). */
export function FlowbiteChatModal(props: {
  show: boolean;
  onDismiss: () => void;
  title: string;
  description?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
  footer: ReactNode;
  size?: NonNullable<ModalProps["size"]>;
  modalRootClassName?: string;
}) {
  const root = typeof document !== "undefined" ? document.body : undefined;

  return (
    <Modal
      dismissible
      position="center"
      root={root}
      show={props.show}
      onClose={props.onDismiss}
      size={props.size ?? "3xl"}
      className={cn("!z-[120]", props.modalRootClassName)}
    >
      <ModalHeader>{props.title}</ModalHeader>
      <ModalBody className={cn(props.bodyClassName)}>
        {props.description ? (
          <p className="mb-4 text-sm leading-snug text-gray-600 dark:text-gray-400">
            {props.description}
          </p>
        ) : null}
        {props.children}
      </ModalBody>
      <ModalFooter className="justify-end gap-3 border-gray-200 dark:border-gray-600">
        {props.footer}
      </ModalFooter>
    </Modal>
  );
}
