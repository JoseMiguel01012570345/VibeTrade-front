import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { cn } from '../../../../../lib/cn'
import { parseDecimal } from '../../../domain/tradeAgreementValidation'
import { onBackdropPointerClose } from '../../../lib/modalClose'
import type { ServicePaymentRecurrence } from '../../../domain/tradeAgreementTypes'
import { emptyServicePaymentRecurrence } from '../../../domain/tradeAgreementTypes'
import { modalShellWide } from '../../../styles/formModalStyles'

const MES = [
  { n: 1, l: 'Ene' },
  { n: 2, l: 'Feb' },
  { n: 3, l: 'Mar' },
  { n: 4, l: 'Abr' },
  { n: 5, l: 'May' },
  { n: 6, l: 'Jun' },
  { n: 7, l: 'Jul' },
  { n: 8, l: 'Ago' },
  { n: 9, l: 'Sep' },
  { n: 10, l: 'Oct' },
  { n: 11, l: 'Nov' },
  { n: 12, l: 'Dic' },
] as const

type Props = {
  open: boolean
  value: ServicePaymentRecurrence
  onSave: (v: ServicePaymentRecurrence) => void
  onClose: () => void
}

export function ServicePaymentRecurrenceModal({ open, value, onSave, onClose }: Props) {
  const [st, setSt] = useState<ServicePaymentRecurrence>(emptyServicePaymentRecurrence())
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (!wasOpenRef.current) {
      setSt({
        months: [...value.months].sort((a, b) => a - b),
        entries: value.entries.map((e) => ({ ...e })),
      })
    }
    wasOpenRef.current = true
  }, [open, value])

  if (!open) return null

  function toggleMonth(n: number) {
    setSt((prev) => {
      const has = prev.months.includes(n)
      const months = has ? prev.months.filter((m) => m !== n) : [...prev.months, n].sort((a, b) => a - b)
      return { ...prev, months }
    })
  }

  function updateEntry(
    i: number,
    patch: Partial<{ month: number; day: number; amount: string }>,
  ) {
    setSt((prev) => {
      const entries = [...prev.entries]
      entries[i] = { ...entries[i], ...patch }
      return { ...prev, entries }
    })
  }

  function addEntry() {
    setSt((prev) => ({
      ...prev,
      entries: [...prev.entries, { month: prev.months[0] ?? 1, day: 1, amount: '1' }],
    }))
  }

  function removeEntry(i: number) {
    setSt((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, j) => j !== i),
    }))
  }

  function save() {
    if (!st.months.length) {
      toast.error('Elegí al menos un mes.')
      return
    }
    if (!st.entries.length) {
      toast.error('Agregá al menos una fila de pago.')
      return
    }
    const seen = new Set<string>()
    for (let i = 0; i < st.entries.length; i++) {
      const en = st.entries[i]
      if (!st.months.includes(en.month)) {
        toast.error(`Fila ${i + 1}: el mes no está entre los meses seleccionados.`)
        return
      }
      const y = new Date().getFullYear()
      const dim = new Date(y, en.month, 0).getDate()
      if (en.day < 1 || en.day > dim) {
        toast.error(`Fila ${i + 1}: día inválido para ese mes.`)
        return
      }
      const key = `${en.month}-${en.day}`
      if (seen.has(key)) {
        toast.error('No podés repetir el mismo mes y día del mes en dos filas.')
        return
      }
      seen.add(key)
      const n = parseDecimal(en.amount)
      if (n === null || n <= 0) {
        toast.error(`Fila ${i + 1}: el monto debe ser mayor que cero.`)
        return
      }
    }
    onSave(st)
    onClose()
  }

  return (
    <div
      className="vt-modal-backdrop z-[90]"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => onBackdropPointerClose(e, onClose)}
    >
      <div className={modalShellWide}>
        <div className="vt-modal-title">Recurrencia de pagos</div>
        <p className="vt-muted mb-3 text-[13px]">
          Elegí los meses que aplican y cargá al menos una fila con día del mes y monto. Podés sumar más
          filas para distintos días o montos.
        </p>

        <div className="mb-4 text-xs font-extrabold text-[var(--muted)]">Meses incluidos</div>
        <div className="mb-6 flex flex-wrap gap-2">
          {MES.map(({ n, l }) => (
            <button
              key={n}
              type="button"
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-bold',
                st.months.includes(n)
                  ? 'border-[var(--primary)] bg-[color-mix(in_oklab,var(--primary)_14%,var(--surface))]'
                  : 'border-[var(--border)] bg-[var(--surface)]',
              )}
              onClick={() => toggleMonth(n)}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="max-h-[min(45vh,360px)] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-bold text-[var(--muted)]">
                <th className="py-2 pr-2">Mes</th>
                <th className="py-2 pr-2">Día</th>
                <th className="py-2 pr-2">Monto</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {st.entries.map((en, i) => (
                <tr key={i} className="border-b border-[color-mix(in_oklab,var(--border)_70%,transparent)]">
                  <td className="py-2 pr-2 align-middle">
                    <select
                      className="vt-input py-1.5 text-sm"
                      value={en.month}
                      onChange={(e) => updateEntry(i, { month: Number(e.target.value) })}
                    >
                      {st.months.map((m) => (
                        <option key={m} value={m}>
                          {MES.find((x) => x.n === m)?.l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2 align-middle">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="vt-input w-[72px] py-1.5 text-sm"
                      value={en.day}
                      onChange={(e) => updateEntry(i, { day: Number(e.target.value) })}
                    />
                  </td>
                  <td className="py-2 pr-2 align-middle">
                    <input
                      className="vt-input min-w-[100px] py-1.5 text-sm"
                      value={en.amount}
                      placeholder="0"
                      inputMode="decimal"
                      onChange={(e) => updateEntry(i, { amount: e.target.value })}
                    />
                  </td>
                  <td className="py-2 align-middle">
                    <button
                      type="button"
                      className="vt-btn vt-btn-ghost vt-btn-sm text-[var(--muted)]"
                      onClick={() => removeEntry(i)}
                      disabled={st.entries.length <= 1}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" className="vt-btn mt-2" onClick={addEntry}>
          + Añadir pago
        </button>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="vt-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="vt-btn vt-btn-primary"
            disabled={!st.months.length || !st.entries.length}
            onClick={save}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
