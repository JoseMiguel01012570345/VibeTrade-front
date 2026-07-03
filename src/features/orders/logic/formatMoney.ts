export function formatMoney(amount: number, currency: string): string {
  const code = (currency || "").trim().toUpperCase();
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency: code || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`.trim();
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "procesado":
      return "Procesado";
    case "en_transito":
      return "En tránsito";
    case "entregado":
      return "Entregado";
    default:
      return status;
  }
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "held":
      return "Retenido (garantía)";
    case "released":
      return "Liberado al vendedor";
    case "refunded":
      return "Reembolsado";
    default:
      return status;
  }
}
