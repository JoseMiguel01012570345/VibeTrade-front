import { ChevronRight, Package, Wrench } from "lucide-react";
import { cn } from "../../lib/cn";

const tileClass = cn(
  "flex w-full min-w-0 flex-col gap-2 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4 text-left transition-colors",
  "min-[560px]:min-w-[min(100%,240px)] min-[560px]:flex-1 min-[560px]:snap-start",
  "hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--primary)_6%,var(--surface))]",
);

type Props = {
  kind: "products" | "services";
  publishedCount: number;
  onClick: () => void;
};

export function StoreCatalogHubTile({ kind, publishedCount, onClick }: Props) {
  const Icon = kind === "products" ? Package : Wrench;
  const title = kind === "products" ? "Productos" : "Servicios";

  return (
    <button type="button" onClick={onClick} className={tileClass}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_55%,var(--surface))]">
          <Icon size={20} className="text-[var(--primary)]" aria-hidden />
        </span>
        <ChevronRight
          size={18}
          className="shrink-0 text-[var(--muted)]"
          aria-hidden
        />
      </div>
      <div>
        <div className="font-black tracking-[-0.02em]">{title}</div>
        <div className="vt-muted mt-1 text-[12px] leading-snug">
          {publishedCount} publicados en vitrina
        </div>
      </div>
    </button>
  );
}
