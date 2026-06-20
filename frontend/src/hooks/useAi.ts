import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { AiChatMessage } from "../types/domain";

export function useAiSummary(customerId?: string) {
  return useQuery({
    queryKey: ["ai-summary", customerId],
    enabled: false, // fetched on demand via refetch()
    queryFn: async () => {
      const { data } = await api.get<{ mode: string; summary: string }>(
        endpoints.aiSummary(customerId as string),
      );
      return data;
    },
  });
}

export function useAiChat(customerId?: string) {
  return useMutation({
    mutationFn: async (messages: AiChatMessage[]) => {
      const { data } = await api.post<{ mode: string; answer: string }>(endpoints.aiChat, {
        customer_id: customerId,
        messages,
      });
      return data;
    },
  });
}
