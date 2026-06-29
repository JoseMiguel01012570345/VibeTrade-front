type ApiErrorBody = { error?: string; message?: string };

export async function friendlyPaymentGatewayError(res: Response): Promise<Error> {
  const raw = await res.text().catch(() => "");
  let parsed: ApiErrorBody | null = null;
  try {
    parsed = raw ? (JSON.parse(raw) as ApiErrorBody) : null;
  } catch {
    parsed = null;
  }
  const code = (parsed?.error ?? "").trim();
  const msg = (parsed?.message ?? "").trim();
  if (code === "payment_gateway_unavailable") {
    return new Error("Pagos no están disponibles ahora. Prueba más tarde.");
  }
  if (code === "missing_payment_method") {
    return new Error("Selecciona una tarjeta para pagar.");
  }
  if (code === "payment_method_not_owned") {
    return new Error("La tarjeta seleccionada no pertenece a tu cuenta.");
  }
  if (code === "already_paid") {
    return new Error("Ya existe un cobro exitoso para esa moneda.");
  }
  if (code === "not_found") {
    return new Error("No se encontró el acuerdo o no tenés acceso.");
  }
  if (code === "checkout_invalid" || code === "invalid_target" || code === "invalid_kind") {
    return new Error(msg || "No se pudo preparar el cobro.");
  }
  if (msg) return new Error(msg);
  return new Error(raw || `HTTP ${res.status}`);
}
