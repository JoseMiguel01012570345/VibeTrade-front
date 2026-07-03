import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  ChevronRight,
  CreditCard,
  Handshake,
  ShoppingBag,
  Store,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppStore } from '@features/auth/logic/useAppStore'
import { useMarketStore } from '@features/market/logic/store/useMarketStore'
import { useMyAffiliateDashboards } from '@features/finance'
import {
  ROLE_AFILIADO,
  ROLE_ALMACEN,
  hasRole,
  isAdmin,
  isSuperAdmin,
} from '@features/auth/logic/roles'

type NavRow = {
  key: string
  label: string
  icon: LucideIcon
  to: string
  highlight?: boolean
  hint?: string
}

/** Menú de navegación del perfil propio: compras, mensualidad, afiliado y accesos admin (gated por rol). */
export function ProfileNavigationMenu({ isMe }: Readonly<{ isMe: boolean }>) {
  const navigate = useNavigate()
  const me = useAppStore((s) => s.me)
  const trustThreshold = useAppStore((s) => s.trustThreshold)
  const stores = useMarketStore((s) => s.stores)
  const { data: affiliateDashboards } = useMyAffiliateDashboards()

  const ownedStores = useMemo(
    () => Object.values(stores).filter((s) => s.ownerUserId === me.id),
    [stores, me.id],
  )

  const rows = useMemo<NavRow[]>(() => {
    if (!isMe) return []

    const blocked = trustThreshold > 0 && me.trustScore < trustThreshold
    const isAffiliate =
      hasRole(me, ROLE_AFILIADO) || (affiliateDashboards?.length ?? 0) > 0
    const admin = isAdmin(me)
    const canWarehouse = hasRole(me, ROLE_ALMACEN)

    const out: NavRow[] = [
      { key: 'purchases', label: 'Mis compras', icon: ShoppingBag, to: '/mis-compras' },
      {
        key: 'mensualidad',
        label: 'Mensualidad',
        icon: CreditCard,
        to: '/mensualidad',
        highlight: blocked,
        hint: blocked ? 'Confianza bajo el umbral' : undefined,
      },
    ]

    if (isAffiliate)
      out.push({ key: 'affiliate', label: 'Afiliado', icon: Handshake, to: '/afiliado' })

    if (admin) {
      out.push(
        { key: 'debts', label: 'Finanzas / Deudas', icon: Wallet, to: '/finanzas/deudas' },
        { key: 'stats', label: 'Estadísticas', icon: BarChart3, to: '/estadisticas' },
      )
    }

    if (isSuperAdmin(me))
      out.push({ key: 'users', label: 'Usuarios', icon: Users, to: '/admin/usuarios' })

    for (const store of ownedStores) {
      if (!canWarehouse && store.ownerUserId !== me.id) continue
      out.push({
        key: `warehouse-${store.id}`,
        label: `Pedidos de almacén — ${store.name || 'Tienda'}`,
        icon: Store,
        to: `/almacen/${store.id}/pedidos`,
      })
    }

    return out
  }, [isMe, me, trustThreshold, affiliateDashboards, ownedStores])

  if (!isMe || rows.length === 0) return null

  return (
    <div className="vt-card vt-card-pad">
      <div className="vt-h2">Accesos</div>
      <div className="vt-divider my-3" />
      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => {
          const Icon = row.icon
          return (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => navigate(row.to)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  row.highlight
                    ? 'border-[color-mix(in_oklab,var(--bad)_45%,var(--border))] bg-[color-mix(in_oklab,var(--bad)_10%,var(--surface))]'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))]'
                }`}
              >
                <Icon
                  size={18}
                  className={row.highlight ? 'text-[var(--bad)]' : 'text-[var(--primary)]'}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--text)]">
                    {row.label}
                  </span>
                  {row.hint ? (
                    <span className="block truncate text-xs text-[var(--bad)]">{row.hint}</span>
                  ) : null}
                </span>
                <ChevronRight size={16} className="shrink-0 text-[var(--muted)]" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
