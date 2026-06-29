import type { ReactNode } from "react";

export type SelectableColumnDef<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};
