import type { ReactNode } from 'react'
import { useCallback } from 'react'
import type { RailRoutesCommand } from '@features/chat/Dtos/rail/railRoutesCommandTypes'
import { dispatchRailRoutesCommand } from '@features/chat/logic/rail/railRoutesBusRegistry'

/** Emite un comando hacia el panel del rail (sin prop drilling de callbacks). */
export function useRailRoutesDispatch(): (cmd: RailRoutesCommand) => void {
  return useCallback((cmd: RailRoutesCommand) => {
    dispatchRailRoutesCommand(cmd)
  }, [])
}

/** @deprecated Usar useRailRoutesDispatch sin Provider. */
export function RailRoutesBusProvider(props: { children: ReactNode }) {
  return <>{props.children}</>
}
