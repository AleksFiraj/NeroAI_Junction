import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { CustomerListItem } from "../types/domain";

export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data } = await api.get<CustomerListItem[]>(endpoints.customers);
      return data;
    },
  });
}
