import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { CustomerDetail } from "../types/domain";

export function useCustomer(customerId?: string) {
  return useQuery({
    queryKey: ["customer", customerId],
    enabled: Boolean(customerId),
    queryFn: async () => {
      const { data } = await api.get<CustomerDetail>(endpoints.customer(customerId as string));
      return data;
    },
  });
}
