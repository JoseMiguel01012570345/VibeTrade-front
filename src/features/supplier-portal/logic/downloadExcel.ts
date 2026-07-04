import writeXlsxFile from "write-excel-file/browser";

export type ExcelCell = string | number | boolean | null | undefined;

export async function downloadExcel(
  headers: string[],
  rows: ExcelCell[][],
  filename: string,
  sheet = "Datos",
): Promise<void> {
  const base = filename.replace(/\.(csv|xlsx)$/i, "");
  await writeXlsxFile([headers, ...rows], { sheet }).toFile(`${base}.xlsx`);
}
