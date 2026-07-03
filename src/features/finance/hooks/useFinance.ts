import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getDebtsOverview,
  getMyAffiliateDashboards,
  liquidateDebts,
} from "../api/financeApi";
import type { LiquidateDebtsRequest } from "../Dtos/finance";

export const financeQueryKeys = {
  debts: (includeLiquidated: boolean, includeDeleted: boolean) =>
    ["finance", "debts", includeLiquidated, includeDeleted] as const,
  affiliateDashboards: ["finance", "affiliate", "mine"] as const,
};

export function useDebtsOverview(includeLiquidated: boolean, includeDeleted: boolean) {
  return useQuery({
    queryKey: financeQueryKeys.debts(includeLiquidated, includeDeleted),
    queryFn: () => getDebtsOverview(includeLiquidated, includeDeleted),
    staleTime: 15_000,
  });
}

export function useLiquidateDebts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LiquidateDebtsRequest) => liquidateDebts(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "debts"] });
    },
  });
}

export function useMyAffiliateDashboards() {
  return useQuery({
    queryKey: financeQueryKeys.affiliateDashboards,
    queryFn: getMyAffiliateDashboards,
    staleTime: 30_000,
  });
}
