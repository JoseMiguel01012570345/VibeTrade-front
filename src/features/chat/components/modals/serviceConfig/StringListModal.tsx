import { useEffect, useRef, useState } from "react";
import { CeButton, CeModal } from "@shared/components/ui";

type Props = {
  open: boolean;
  title: string;
  items: string[];
  onSave: (items: string[]) => void;
  onClose: () => void;
  placeholder?: string;
};

export function StringListModal({
  open,
  title,
  items: initial,
  onSave,
  onClose,
  placeholder = "Una línea por ítem",
}: Props) {
  const [text, setText] = useState("");
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    if (!wasOpenRef.current) setText(initial.join("\n"));
    wasOpenRef.current = true;
  }, [open, initial]);

  function save() {
    const lines = text
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    onSave(lines);
    onClose();
  }

  return (
    <CeModal
      show={open}
      onClose={onClose}
      title={title}
      size="md"
      bodyClassName="pt-2"
      footer={
        <>
          <CeButton color="gray" outline onClick={onClose}>
            Cancelar
          </CeButton>
          <CeButton onClick={save}>Guardar lista</CeButton>
        </>
      }
    >
      <textarea
        className="mt-1 min-h-[160px] w-full resize-y rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/40 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        rows={8}
      />
    </CeModal>
  );
}
