import type { ReactNode } from "react";
import { PROVEEDOR_TABLE_LIST_SHELL } from "../logic/proveedorSectionConstants";
import type { SummaryCardAccent } from "../Dtos/supplierPortalTypes";

export function ProveedorSectionSummaryCard({
  title,
  value,
  accent,
  icon,
}: {
  title: string;
  value: string;
  accent?: SummaryCardAccent;
  icon: ReactNode;
}) {
  return (
    <div className={`relative ${PROVEEDOR_TABLE_LIST_SHELL} p-5`}>
      {accent === "green" ? (
        <span className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl bg-[#0f6b4f]" />
      ) : null}
      {accent === "gray" ? (
        <span className="absolute bottom-0 left-0 top-0 w-1 rounded-l-xl bg-gray-300 dark:bg-gray-600" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className={accent ? "pl-2" : undefined}>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#0f6b4f] dark:bg-emerald-950/60 dark:text-emerald-300">
          {icon}
        </div>
      </div>
    </div>
  );
}
