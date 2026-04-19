export function FeedLoadingSpinner({ label }: Readonly<{ label: string }>) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="h-10 w-10 shrink-0 rounded-full border-2 border-solid border-[var(--border)] border-t-[var(--primary)] motion-safe:animate-spin"
        aria-hidden
      />
      <span className="text-sm font-semibold text-[var(--muted)]">{label}</span>
    </div>
  );
}
