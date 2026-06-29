type Props = Readonly<{
  devHint?: string | null
  label?: string
}>

export function DevCodeBanner({ devHint, label = 'código actual' }: Props) {
  if (!devHint) return null
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_50%,var(--surface))] px-3 py-2 text-xs text-[var(--muted)]">
      <span className="font-extrabold text-[var(--text)]">Dev:</span> {label}{' '}
      <span className="font-black tracking-wide text-[var(--text)]">{devHint}</span>
    </div>
  )
}
