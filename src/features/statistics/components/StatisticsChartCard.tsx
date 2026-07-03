import type { ReactNode } from "react";

export function StatisticsChartCard({
  title,
  subtitle,
  children,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm ${className ?? ""}`}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

export function StatisticsEmpty({
  message = "Sin datos en el periodo",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-sm text-[var(--muted)]">
      {message}
    </div>
  );
}
