import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiLong } from "../api/client";
import { endpoints } from "../api/endpoints";

function useInvalidateAll() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({
      predicate: (q) =>
        ["customers", "customer", "dashboard", "heatmap", "risk"].includes(
          q.queryKey[0] as string,
        ),
    });
}

export function useReviewCustomer() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (vars: { customerId: string; status: string; note?: string }) => {
      const { data } = await api.post(endpoints.review(vars.customerId), {
        status: vars.status,
        note: vars.note,
      });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useAddConsumption() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (vars: { customerId: string; consumption_kwh: number }) => {
      const { data } = await apiLong.post(endpoints.addConsumption(vars.customerId), {
        consumption_kwh: vars.consumption_kwh,
      });
      return data;
    },
    onSuccess: invalidate,
  });
}

export function useAdvanceMonth() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiLong.post(endpoints.advanceMonth, {});
      return data;
    },
    onSuccess: invalidate,
  });
}
