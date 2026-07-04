import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import { cn } from "@shared/lib/cn";

/** Botón de carrito con estilo emerald del storefront (header / overlay global). */
export function CartNavButton({
  href,
  count,
  className,
}: Readonly<{
  href: string;
  count: number;
  className?: string;
}>) {
  const label =
    count > 0 ? `Ir al carrito (${count})` : "Ir al carrito";

  return (
    <Link
      to={href}
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-[0_2px_10px_rgba(15,118,110,0.08)] transition hover:border-emerald-200 hover:bg-emerald-100",
        className,
      )}
      aria-label={label}
    >
      <ShoppingCart size={18} aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-5 text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
