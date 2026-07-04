import { ProtectedMediaImg } from '@shared/components/media/ProtectedMediaImg'
import type { TradeAgreementExtraFieldDraft } from '@features/chat/Dtos/agreement/tradeAgreementTypes';
import {
  agrDetailLabel,
  agrDetailLink,
  agrDetailRow,
  agrDetailValue,
} from '@shared/styles/modals/formModalStyles'

export {
  fmtAgreementMoneyMinor,
  normalizeEvidenceForCompare,
} from '@features/chat/logic/agreement/agreementDetailFormatters'

export function AgreementDetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  if (!value.trim()) return null
  return (
    <div className={agrDetailRow}>
      <div className={agrDetailLabel}>{label}</div>
      <div className={agrDetailValue}>{value}</div>
    </div>
  )
}

export function ExtraFieldClauseCards({
  fields,
}: {
  fields: TradeAgreementExtraFieldDraft[]
}) {
  if (!fields.length) return null
  return (
    <>
      {fields.map((f) => (
        <div
          key={f.id}
          className="mb-4 rounded-xl border border-[color-mix(in_oklab,var(--border)_72%,transparent)] p-3 last:mb-0"
        >
          <div className="mb-2 font-extrabold text-[var(--text)]">
            {f.title.trim() || '(sin título)'}
          </div>
          {f.valueKind === 'text' && (f.textValue ?? '').trim() ? (
            <div className="whitespace-pre-wrap text-sm text-[var(--text)]">
              {(f.textValue ?? '').trim()}
            </div>
          ) : null}
          {f.valueKind === 'image' && (f.mediaUrl ?? '').trim() ? (
            <div className="mt-2 max-w-lg">
              <ProtectedMediaImg
                src={(f.mediaUrl ?? '').trim()}
                alt=""
                className="max-h-72 w-full rounded border border-[var(--border)] object-contain"
              />
            </div>
          ) : null}
          {f.valueKind === 'document' && (f.mediaUrl ?? '').trim() ? (
            <a
              href={(f.mediaUrl ?? '').trim()}
              target="_blank"
              rel="noreferrer"
              className={agrDetailLink}
            >
              {f.fileName?.trim() || 'Abrir documento adjunto'}
            </a>
          ) : null}
        </div>
      ))}
    </>
  )
}

