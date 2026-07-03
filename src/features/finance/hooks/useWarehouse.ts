import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  advanceOrder,
  invalidateOrder,
  listStoreOrders,
  uploadClientEvidence,
} from "../api/warehouseApi";

export const warehouseQueryKeys = {
  storeOrders: (storeId: string) => ["warehouse", "orders", storeId] as const,
};

export function useStoreOrders(storeId: string) {
  return useQuery({
    queryKey: warehouseQueryKeys.storeOrders(storeId),
    queryFn: () => listStoreOrders(storeId),
    enabled: storeId.trim().length > 0,
    staleTime: 15_000,
  });
}

export function useAdvanceOrder(storeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { orderId: string; toStatus: string }) =>
      advanceOrder(vars.orderId, vars.toStatus),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseQueryKeys.storeOrders(storeId) });
    },
  });
}

export function useUploadClientEvidence(storeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { orderId: string; urls: string[]; note?: string }) =>
      uploadClientEvidence(vars.orderId, vars.urls, vars.note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseQueryKeys.storeOrders(storeId) });
    },
  });
}

export function useInvalidateOrder(storeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { orderId: string; reason?: string }) =>
      invalidateOrder(vars.orderId, vars.reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: warehouseQueryKeys.storeOrders(storeId) });
    },
  });
}
