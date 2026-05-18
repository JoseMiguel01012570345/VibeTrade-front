import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import type { Subject } from "rxjs";
import type { RailRoutesCommand } from "./railRoutesCommands";

const RailRoutesBusContext =
  createContext<Subject<RailRoutesCommand> | null>(null);

export function RailRoutesBusProvider(props: {
  subject: Subject<RailRoutesCommand>;
  children: ReactNode;
}) {
  return (
    <RailRoutesBusContext.Provider value={props.subject}>
      {props.children}
    </RailRoutesBusContext.Provider>
  );
}

/** Emite un comando hacia el panel del rail (sin prop drilling de callbacks). */
export function useRailRoutesDispatch(): (cmd: RailRoutesCommand) => void {
  const subject = useContext(RailRoutesBusContext);
  if (!subject) {
    throw new Error(
      "useRailRoutesDispatch debe usarse dentro de RailRoutesBusProvider",
    );
  }
  return useCallback(
    (cmd: RailRoutesCommand) => {
      subject.next(cmd);
    },
    [subject],
  );
}
