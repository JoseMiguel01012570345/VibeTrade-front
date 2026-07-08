import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";

export function CategoryTileLink({
  label,
  to,
  kind,
}: Readonly<{
  label: string;
  to: string;
  kind: "product" | "service";
}>) {
  return (
    <Link
      to={to}
      className="vt-storefront-category-tile inline-flex h-full w-full items-center justify-center gap-1.5 rounded-full border border-[#d9d5cf] bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-emerald-400 hover:text-emerald-700 hover:shadow-[0_4px_14px_rgba(5,150,105,0.12)]"
    >
      {kind === "service" ? (
        <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : null}
      <span>{label}</span>
    </Link>
  );
}
