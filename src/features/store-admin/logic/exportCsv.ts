/** Escapa un valor para CSV (comillas dobles y separadores). */
function csvCell(value: string): string {
  const needsQuotes = /[",\n;]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/**
 * Genera y descarga un CSV en el navegador. Se usa para el botón "Exportar" de
 * las secciones del panel (productos, servicios, pedidos, etc.).
 */
export function downloadCsv(
  fileName: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const lines = [
    headers.map((h) => csvCell(h)).join(","),
    ...rows.map((r) => r.map((c) => csvCell(String(c))).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
