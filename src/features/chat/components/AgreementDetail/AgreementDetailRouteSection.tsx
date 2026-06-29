import { useEffect, useMemo, useState } from 'react'
import { cn } from '@shared/lib/cn'
import { VtSelect, type VtSelectOption } from '@shared/components/ui/VtSelect'
import type { RouteSheet } from '@features/chat/model/routeSheetTypes'
import type { TradeAgreement } from '@features/chat/model/tradeAgreementTypes'
import { agreementHasMerchandiseForRouteLink } from '@features/chat/model/tradeAgreementValidation'
import {
  agrDetailBlock,
  agrDetailH,
  agrDetailHint,
  agrDetailLink,
  agrDetailRow,
  agrDetailLabel,
  fieldLabel,
  linkRutaRow,
  linkRutaSelect,
} from '../../model/formModalStyles'

type Props = {
  agreement: TradeAgreement
  routeSheets: RouteSheet[]
  routeSheetIdsLinkedElsewhere?: ReadonlySet<string>
  onOpenRouteSheet?: (routeSheetId: string) => void
  onLinkRouteSheet?: (agreementId: string, routeSheetId: string) => void
  onUnlinkRouteSheet?: (agreementId: string) => void
  linkActionsDisabled?: boolean
  routeLinkFrozenAfterPayment?: boolean
}

export function AgreementDetailRouteSection({
  agreement: a,
  routeSheets,
  routeSheetIdsLinkedElsewhere,
  onOpenRouteSheet,
  onLinkRouteSheet,
  onUnlinkRouteSheet,
  linkActionsDisabled = false,
  routeLinkFrozenAfterPayment = false,
}: Props) {
  const [pickId, setPickId] = useState(a.routeSheetId ?? '')
  useEffect(() => {
    setPickId(a.routeSheetId ?? '')
  }, [a.id, a.routeSheetId])

  if (!onLinkRouteSheet && !a.routeSheetId && !a.routeSheetUrl) return null

  const linkedSheet = a.routeSheetId
    ? routeSheets.find((r) => r.id === a.routeSheetId)
    : undefined
  const linkedTitle = linkedSheet?.titulo
  const routeLinked = !!a.routeSheetId
  const linkPublishedLocked =
    !!a.routeSheetId && !!linkedSheet?.publicadaPlataforma
  const canUnlinkRoute =
    !!a.routeSheetId &&
    !linkedSheet?.publicadaPlataforma &&
    !!onUnlinkRouteSheet &&
    !routeLinkFrozenAfterPayment
  const merchOkForRouteLink = agreementHasMerchandiseForRouteLink(a)
  const selectRouteSheetDisabled =
    linkPublishedLocked ||
    linkActionsDisabled ||
    routeLinkFrozenAfterPayment ||
    (!!onLinkRouteSheet && !merchOkForRouteLink)
  const vincularDisabled =
    linkActionsDisabled ||
    linkPublishedLocked ||
    routeLinkFrozenAfterPayment ||
    !pickId ||
    pickId === (a.routeSheetId ?? '') ||
    !merchOkForRouteLink

  const routeSheetSelectOptions: VtSelectOption[] = useMemo(
    () => [
      { value: '', label: 'Sin vincular — seleccionar…' },
      ...routeSheets
        .filter(
          (r) =>
            !routeSheetIdsLinkedElsewhere?.has(r.id) ||
            r.id === (a.routeSheetId ?? ''),
        )
        .map((r) => ({
          value: r.id,
          label: r.publicadaPlataforma ? `${r.titulo} (publicada)` : r.titulo,
        })),
    ],
    [routeSheets, routeSheetIdsLinkedElsewhere, a.routeSheetId],
  )

  return (
    <div className={agrDetailBlock}>
      <div className={agrDetailH}>Hoja de ruta (roadmap)</div>
      {onLinkRouteSheet ? (
        <>
          <p className={cn('vt-muted', agrDetailHint, 'mb-2')}>
            Elige una sola hoja de ruta del chat para este acuerdo. Podés cambiarla
            mientras la hoja no esté publicada a transportistas
            {a.hasSucceededPayments && !a.routeSheetId
              ? ', incluso después del primer cobro de mercancía'
              : ''}
            .
          </p>
          {!merchOkForRouteLink ? (
            <p className={cn('vt-muted', agrDetailHint, 'mb-2')}>
              Solo podés vincular una hoja de ruta si el acuerdo incluye mercancía
              con al menos una línea con cantidad, precio unitario y moneda válidos.
            </p>
          ) : null}
          {routeSheets.length === 0 ? (
            <p className={cn('vt-muted', agrDetailHint)}>
              No hay hojas de ruta en este chat. Crea una en la pestaña Rutas y
              volvé para vincularla.
            </p>
          ) : (
            <>
              {linkActionsDisabled ? (
                <p className={cn('vt-muted', agrDetailHint, 'mb-2')}>
                  La vinculación de hojas de ruta no está disponible en este
                  momento.
                </p>
              ) : routeLinkFrozenAfterPayment ? (
                <p className={cn('vt-muted', agrDetailHint, 'mb-2')}>
                  {a.hasAcceptedMerchandiseEvidence ? (
                    <>
                      Con evidencia de mercancía{' '}
                      <strong className="text-[var(--text)]">aceptada</strong>,
                      el roadmap vinculado no se puede modificar ni quitar desde
                      aquí.
                    </>
                  ) : (
                    <>
                      Con pagos de transporte registrados y hoja vinculada, el
                      roadmap no se puede modificar ni quitar desde aquí.
                    </>
                  )}
                </p>
              ) : a.hasSucceededPayments && !a.routeSheetId ? (
                <p className={cn('vt-muted', agrDetailHint, 'mb-2')}>
                  Ya hay cobros de mercancía: vinculá una hoja para habilitar el
                  pago del transporte.
                </p>
              ) : null}
              <div className={linkRutaRow}>
                <div className={linkRutaSelect}>
                  <span className={fieldLabel}>Roadmap vinculado</span>
                  <VtSelect
                    value={pickId}
                    onChange={setPickId}
                    options={routeSheetSelectOptions}
                    placeholder="Sin vincular — seleccionar…"
                    disabled={selectRouteSheetDisabled}
                    ariaLabel="Seleccionar hoja de ruta para el acuerdo"
                    listPortal
                    listPortalZIndexClass="z-[220]"
                  />
                </div>
                <button
                  type="button"
                  className="vt-btn vt-btn-primary shrink-0"
                  disabled={vincularDisabled}
                  onClick={() => {
                    if (!pickId || !onLinkRouteSheet || vincularDisabled) return
                    onLinkRouteSheet(a.id, pickId)
                  }}
                >
                  {routeLinked &&
                  !linkPublishedLocked &&
                  pickId !== (a.routeSheetId ?? '')
                    ? 'Actualizar vínculo'
                    : 'Vincular'}
                </button>
                {canUnlinkRoute ? (
                  <button
                    type="button"
                    className="vt-btn shrink-0"
                    disabled={linkActionsDisabled || routeLinkFrozenAfterPayment}
                    onClick={() => {
                      if (
                        linkActionsDisabled ||
                        routeLinkFrozenAfterPayment ||
                        !onUnlinkRouteSheet
                      )
                        return
                      onUnlinkRouteSheet(a.id)
                    }}
                  >
                    Desvincular
                  </button>
                ) : null}
              </div>
              {linkPublishedLocked ? (
                <p className={cn('vt-muted', agrDetailHint, 'mt-1.5')}>
                  Esta hoja ya está{' '}
                  <strong className="text-[var(--text)]">publicada</strong> en la
                  plataforma: el roadmap vinculado no se puede modificar ni quitar
                  desde aquí.
                </p>
              ) : routeLinked ? (
                <p className={cn('vt-muted', agrDetailHint, 'mt-1.5')}>
                  Podés elegir otra hoja en el selector y usar «Actualizar
                  vínculo», o desvincular para dejar el acuerdo sin roadmap. Cada
                  hoja solo puede estar vinculada a un acuerdo a la vez.
                </p>
              ) : null}
            </>
          )}
        </>
      ) : (
        <p className={cn('vt-muted', agrDetailHint, 'mb-2')}>
          Solo la tienda puede vincular o actualizar la hoja de ruta cuando el
          estado del acuerdo y el chat lo permitan.
        </p>
      )}
      {a.routeSheetId ? (
        <p className={cn('vt-muted', agrDetailHint, 'mt-2')}>
          Vinculada ahora a:{' '}
          <strong>{linkedTitle ?? 'hoja de ruta (sincronizando título…)'}</strong>
        </p>
      ) : null}
      {a.routeSheetId && onOpenRouteSheet ? (
        <button
          type="button"
          className="vt-btn vt-btn-sm mt-2"
          onClick={() => onOpenRouteSheet(a.routeSheetId!)}
        >
          Ver hoja de ruta en el panel
        </button>
      ) : null}
      {a.routeSheetUrl ? (
        <div className={cn(agrDetailRow, 'mt-2.5')}>
          <div className={agrDetailLabel}>Enlace externo</div>
          <a
            href={a.routeSheetUrl}
            target="_blank"
            rel="noreferrer"
            className={agrDetailLink}
          >
            {a.routeSheetUrl}
          </a>
        </div>
      ) : null}
    </div>
  )
}
