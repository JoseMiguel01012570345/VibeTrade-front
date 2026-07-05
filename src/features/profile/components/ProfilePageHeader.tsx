import { ArrowLeft } from "lucide-react";

type Props = Readonly<{
  title: string;
  onBack: () => void;
}>;

export function ProfilePageHeader({ title, onBack }: Props) {
  return (
    <header className="mb-5 flex min-w-0 items-center gap-3 pr-[3.25rem]">
      <button
        type="button"
        className="vt-profile-back-btn shrink-0"
        onClick={onBack}
        aria-label="Volver"
      >
        <ArrowLeft size={20} strokeWidth={2.25} aria-hidden />
      </button>
      <h1 className="vt-profile-title min-w-0 flex-1 break-words">{title}</h1>
    </header>
  );
}
