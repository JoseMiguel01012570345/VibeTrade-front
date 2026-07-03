import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@features/auth/logic/useAppStore";
import { getMyTrustStatus, payMensualidad } from "../api/trustGateApi";
import type { MensualidadPayRequest } from "../Dtos/trustGate";

export const trustGateQueryKeys = {
  status: ["trust", "status", "me"] as const,
};

/**
 * Consulta el estado de la barra de confianza y lo sincroniza con el store global
 * (puntaje + umbral) para que el gate de interacciones y el modal de umbral respondan
 * al backend (wiki cap. 08/10).
 */
export function useTrustGate() {
  const isSessionActive = useAppStore((s) => s.isSessionActive);
  const setTrustGate = useAppStore((s) => s.setTrustGate);

  const query = useQuery({
    queryKey: trustGateQueryKeys.status,
    queryFn: getMyTrustStatus,
    enabled: isSessionActive,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data) setTrustGate(query.data.trustScore, query.data.threshold);
  }, [query.data, setTrustGate]);

  return query;
}

export function usePayMensualidad() {
  const qc = useQueryClient();
  const setTrustGate = useAppStore((s) => s.setTrustGate);
  return useMutation({
    mutationFn: (body: MensualidadPayRequest = {}) => payMensualidad(body),
    onSuccess: (res) => {
      setTrustGate(res.status.trustScore, res.status.threshold);
      void qc.invalidateQueries({ queryKey: trustGateQueryKeys.status });
    },
  });
}
