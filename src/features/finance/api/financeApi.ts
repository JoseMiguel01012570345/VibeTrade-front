import { apiFetch } from "@shared/services/http/apiClient";
import { apiErrorTextToUserMessage } from "@shared/services/http/apiErrorMessage";
import type {
  AffiliateDashboardDto,
  DebtsOverviewDto,
  LiquidateDebtsRequest,
  LiquidateDebtsResponse,
} from "../Dtos/finance";

async function throwFromResponse(res: Response): Promise<never> {
  const text = await res.text().catch(() => "");
  throw new Error(apiErrorTextToUserMessage(text));
}

export async function getDebtsOverview(
  includeLiquidated: boolean,
  includeDeleted: boolean,
): Promise<DebtsOverviewDto> {
  const qs = new URLSearchParams({
    includeLiquidated: String(includeLiquidated),
    includeDeleted: String(includeDeleted),
  });
  const res = await apiFetch(`/api/v1/admin/debts?${qs.toString()}`);
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as DebtsOverviewDto;
}

export async function liquidateDebts(
  body: LiquidateDebtsRequest,
): Promise<LiquidateDebtsResponse> {
  const res = await apiFetch("/api/v1/admin/debts/liquidate", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as LiquidateDebtsResponse;
}

export async function getMyAffiliateDashboards(): Promise<AffiliateDashboardDto[]> {
  const res = await apiFetch("/api/v1/affiliates/mine");
  if (!res.ok) await throwFromResponse(res);
  return (await res.json()) as AffiliateDashboardDto[];
}
