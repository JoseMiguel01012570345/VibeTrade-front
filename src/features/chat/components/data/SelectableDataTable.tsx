import type { ReactNode } from "react";
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import type { SelectableColumnDef } from "@features/chat/Dtos/shared/selectableDataTableTypes";

/** Tabla con columna inicial de selección (Flowbite Checkbox + tabla). */
export function SelectableDataTable<T>(props: {
  rows: readonly T[];
  columns: readonly SelectableColumnDef<T>[];
  getRowKey: (row: T) => string;
  selectedKeys: ReadonlySet<string>;
  onToggleRow: (key: string, checked: boolean) => void;
  selectAllChecked: boolean;
  selectAllIndeterminate: boolean;
  onToggleAll: (checked: boolean) => void;
  disabled?: boolean;
  selectColumnHeaderLabel?: string;
  emptyMessage?: ReactNode;
}) {
  if (props.rows.length === 0 && props.emptyMessage) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {props.emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
      <Table hoverable className="min-w-[480px] text-left">
        <TableHead>
          <TableRow className="bg-gray-50 dark:bg-gray-700/50 [&>th:first-child]:w-14">
            <TableHeadCell className="p-4">
              <Checkbox
                aria-label={
                  props.selectColumnHeaderLabel ?? "Seleccionar todas las filas"
                }
                checked={props.selectAllChecked}
                disabled={props.disabled}
                indeterminate={props.selectAllIndeterminate}
                onChange={(e) => props.onToggleAll(e.target.checked)}
              />
            </TableHeadCell>
            {props.columns.map((col) => (
              <TableHeadCell key={col.id} scope="col" className={col.className}>
                {col.header}
              </TableHeadCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody className="divide-y divide-gray-200 dark:divide-gray-700">
          {props.rows.map((row) => {
            const key = props.getRowKey(row);
            return (
              <TableRow key={key} className="bg-white dark:bg-gray-800">
                <TableCell className="p-4">
                  <Checkbox
                    aria-label={`Seleccionar fila ${key}`}
                    checked={props.selectedKeys.has(key)}
                    disabled={props.disabled}
                    onChange={(e) => props.onToggleRow(key, e.target.checked)}
                  />
                </TableCell>
                {props.columns.map((col) => (
                  <TableCell
                    key={col.id}
                    className={`whitespace-normal ${col.className ?? ""}`}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
