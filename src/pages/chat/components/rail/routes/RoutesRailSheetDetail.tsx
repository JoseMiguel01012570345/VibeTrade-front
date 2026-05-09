import { useNavigate } from "react-router-dom";
import type { RoutesRailSheetDetailProps } from "./routesRailSheetDetailTypes";
import { composeRoutesRailDetailShellMerged } from "./routesRailSheetDetailComposer";
import { RoutesRailSheetDetailShell } from "./RoutesRailSheetDetailShell";

export type {
  CedeOwnershipModalState,
  CarrierEvEditModalState,
  CarrierEvReadModalState,
} from "../shared/routesRailSheetModalTypes";
export type { RoutesRailSheetDetailProps } from "./routesRailSheetDetailTypes";

/** Detalle de una hoja de ruta seleccionada: barra de acciones, mercancías, mapa en vivo y lista de tramos con logística. */
export function RoutesRailSheetDetail(props: RoutesRailSheetDetailProps) {
  // Estados
  const navigate = useNavigate();

  // Funciones
  const shellMerged = composeRoutesRailDetailShellMerged(navigate, props);

  // useEffects

  // Vista (HTML + CSS)
  return <RoutesRailSheetDetailShell {...shellMerged} />;
}
