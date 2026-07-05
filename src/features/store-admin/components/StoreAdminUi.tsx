import type { ReactNode } from "react";
import { AdminPagination } from "./AdminPagination";

/** Clases compartidas para tablas del panel admin. */
export const adminTableClass =
  "w-full border-collapse text-left text-sm";
export const adminTableHeadRowClass =
  "border-b border-gray-200 bg-gray-50/90 text-xs font-bold uppercase tracking-wider text-gray-600 dark:border-gray-700 dark:bg-gray-800/90 dark:text-slate-300";
export const adminTableBodyClass =
  "divide-y divide-gray-100 dark:divide-gray-800";

type AdminTableFooterProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (p: number) => void;
  itemLabel: string;
};

/** Pie de tabla estándar: contador + paginación Anterior/Siguiente. */
export function AdminTableFooter({
  page,
  totalPages,
  totalItems,
  onPageChange,
  itemLabel,
}: AdminTableFooterProps) {
  return (
    <div className="border-t border-gray-100 px-4 py-4 dark:border-gray-800">
      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={onPageChange}
        itemLabel={itemLabel}
      />
    </div>
  );
}

/** Tarjeta base del panel (look del frontend-admin de referencia). */
export function AdminCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200/90 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

/** Tarjeta de KPI/resumen (p. ej. "Total productos 132"). */
export function SummaryCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        {icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            {icon}
          </span>
        ) : (
          <span className="h-9 w-9 shrink-0" aria-hidden />
        )}
      </div>
      <p className="mt-2 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs font-medium text-emerald-700">{hint}</p>
      ) : null}
    </div>
  );
}

/** Encabezado de sección: título, subtítulo y acciones a la derecha. */
export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-black tracking-tight text-gray-900 sm:text-2xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** Botón primario verde del panel. */
export function AdminPrimaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
    >
      {children}
    </button>
  );
}

/** Botón secundario (contorno) del panel. */
export function AdminGhostButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
    >
      {children}
    </button>
  );
}

export function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`}
      aria-hidden
    />
  );
}

/** Contenedor de tabla con scroll horizontal. */
export function AdminTableFrame({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

/** Estado vacío estándar de una sección. */
export function AdminEmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-14 text-center">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {hint ? <p className="mt-1 text-sm text-gray-500">{hint}</p> : null}
    </div>
  );
}
