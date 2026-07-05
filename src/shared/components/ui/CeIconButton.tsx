import { forwardRef } from 'react'
import { cn } from '@shared/lib/cn'
import type { CeIconButtonProps } from '@shared/types/ceUi'

export type { CeIconButtonProps } from '@shared/types/ceUi'

const base =
  'inline-flex items-center justify-center rounded-lg p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0f6b4f]/35 disabled:pointer-events-none disabled:opacity-45'

const variants = {
  default: 'text-gray-500 hover:bg-gray-100 hover:text-[#0f6b4f] dark:hover:bg-gray-800',
  danger: 'text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40',
} as const

export const CeIconButton = forwardRef<HTMLButtonElement, CeIconButtonProps>(function CeIconButton(
  { variant = 'default', className, type = 'button', ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(base, variants[variant], className)} {...props} />
})
