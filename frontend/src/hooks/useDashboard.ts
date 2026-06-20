import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { DashboardData } from "../types/domain";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardData>(endpoints.dashboard);
      return data;
    },
  });
}
