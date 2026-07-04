export function PaginationArrow({
  direction,
  disabled,
  onClick,
}: Readonly<{
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d5cf] bg-white text-lg font-bold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={direction === "prev" ? "Página anterior" : "Página siguiente"}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}
