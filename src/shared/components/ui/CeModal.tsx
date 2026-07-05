import { ModalBody, ModalFooter, ModalHeader } from 'flowbite-react'
import type { ReactNode } from 'react'
import { cn } from '@shared/lib/cn'
import { CeTransitionModalShell } from './CeTransitionModalShell'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'

type Props = Readonly<{
  show: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: ModalSize
  /** Sustituye la clase del cuerpo (p. ej. mapas altos sin recorte). */
  bodyClassName?: string
  /** Estilo del encabezado (icono + título personalizado). */
  headerClassName?: string
}>

const DEFAULT_BODY_CLASS = 'overflow-y-auto max-h-[min(70vh,32rem)]'

/**
 * Modal estándar del sitio (transición 300ms vía CeTransitionModalShell).
 *
 * Acciones async en footer: usar CeButton con `loading={submitting}` y deshabilitar
 * cancelar mientras submitting. Carga de datos al abrir: CeSpinner centrado en children.
 */
export function CeModal({
  show,
  onClose,
  title,
  children,
  footer,
  size = '2xl',
  bodyClassName = DEFAULT_BODY_CLASS,
  headerClassName,
}: Props) {
  return (
    <CeTransitionModalShell show={show} onClose={onClose} size={size}>
      <ModalHeader className={cn('border-b-0 dark:border-b-0', headerClassName)}>
        {title}
      </ModalHeader>
      <ModalBody className={bodyClassName}>{children}</ModalBody>
      {footer ? <ModalFooter>{footer}</ModalFooter> : null}
    </CeTransitionModalShell>
  )
}
