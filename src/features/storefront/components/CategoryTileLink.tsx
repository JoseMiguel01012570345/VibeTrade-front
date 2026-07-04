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
      className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-[#d9d5cf] bg-white px-4 py-5 text-center text-emerald-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_34px_rgba(5,150,105,0.12)]"
    >
      {kind === "service" ? (
        <Wrench className="h-5 w-5 shrink-0" aria-hidden />
      ) : null}
      <span className="text-sm font-bold">{label}</span>
    </Link>
  );
}
