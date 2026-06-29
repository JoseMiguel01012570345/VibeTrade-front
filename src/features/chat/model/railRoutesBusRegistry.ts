import type { RailRoutesCommand } from '../components/rail/bus/railRoutesCommands'
import { createRailRoutesBusService, type RailRoutesBusService } from './railRoutes.service'

let activeBus: RailRoutesBusService | null = null

/** Registra el bus activo del panel de rutas (montaje/desmontaje). */
export function registerRailRoutesBus(bus: RailRoutesBusService): () => void {
  activeBus = bus
  return () => {
    if (activeBus === bus) activeBus = null
  }
}

export function dispatchRailRoutesCommand(cmd: RailRoutesCommand): void {
  if (!activeBus) {
    throw new Error('dispatchRailRoutesCommand debe usarse con un panel de rutas montado')
  }
  activeBus.dispatch(cmd)
}

export { createRailRoutesBusService, RailRoutesBusService }
