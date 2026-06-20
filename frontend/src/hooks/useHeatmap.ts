import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { HeatmapData } from "../types/domain";

export function useHeatmap() {
  return useQuery({
    queryKey: ["heatmap"],
    queryFn: async () => {
      const { data } = await api.get<HeatmapData>(endpoints.heatmap);
      return data;
    },
  });
}
