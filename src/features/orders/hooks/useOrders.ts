import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOrder,
  decideClientEvidence,
  listMyOrders,
  previewCheckout,
  trackOrder,
} from "../api/ordersApi";
import type { CreateOrderRequest } from "../Dtos/orders";

export const ordersQueryKeys = {
  mine: ["orders", "mine"] as const,
  track: (publicNumber: string) =>
    ["orders", "track", publicNumber.trim()] as const,
};

export function useMyOrders() {
  return useQuery({
    queryKey: ordersQueryKeys.mine,
    queryFn: listMyOrders,
    staleTime: 30_000,
  });
}

export function useOrderTracking(publicNumber: string) {
  return useQuery({
    queryKey: ordersQueryKeys.track(publicNumber),
    queryFn: () => trackOrder(publicNumber),
    enabled: publicNumber.trim().length > 0,
    refetchInterval: 20_000,
  });
}

export function useCheckoutPreview() {
  return useMutation({
    mutationFn: (body: CreateOrderRequest) => previewCheckout(body),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrderRequest) => createOrder(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ordersQueryKeys.mine });
    },
  });
}

export function useDecideEvidence(publicNumber: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { orderId: string; accept: boolean; rejectReason?: string }) =>
      decideClientEvidence(vars.orderId, vars.accept, vars.rejectReason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ordersQueryKeys.track(publicNumber) });
      void qc.invalidateQueries({ queryKey: ordersQueryKeys.mine });
    },
  });
}
