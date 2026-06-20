import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { RiskData } from "../types/domain";

export function useRisk(customerId?: string) {
  return useQuery({
    queryKey: ["risk", customerId],
    enabled: Boolean(customerId),
    queryFn: async () => {
      const { data } = await api.get<RiskData>(endpoints.risk(customerId as string));
      return data;
    },
  });
}
