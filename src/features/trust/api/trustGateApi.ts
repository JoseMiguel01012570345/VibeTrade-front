import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage } from "@shared/services/http/apiErrorMessage";
import type {
  MensualidadPayRequest,
  MensualidadPayResponse,
  TrustStatusDto,
} from "../Dtos/trustGate";

async function throwFromResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new Error(apiErrorTextToUserMessage(text));
}

export async function getMyTrustStatus(): Promise<TrustStatusDto> {
  const res = await apiFetch("/api/v1/me/trust-status");
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as TrustStatusDto;
}

export async function payMensualidad(
  body: MensualidadPayRequest = {},
): Promise<MensualidadPayResponse> {
  const res = await apiFetch("/api/v1/me/mensualidad", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as MensualidadPayResponse;
}
