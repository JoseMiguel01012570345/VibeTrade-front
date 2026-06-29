import { Subject } from 'rxjs'
import type { RailRoutesCommand } from '../components/rail/bus/railRoutesCommands'

/**
 * Bus de comandos del rail de rutas (por instancia de panel).
 * Evita prop drilling de callbacks hacia filas de tramos.
 */
export class RailRoutesBusService {
  readonly commands$ = new Subject<RailRoutesCommand>()

  dispatch(cmd: RailRoutesCommand): void {
    this.commands$.next(cmd)
  }

  dispose(): void {
    this.commands$.complete()
  }
}

export function createRailRoutesBusService(): RailRoutesBusService {
  return new RailRoutesBusService()
}
