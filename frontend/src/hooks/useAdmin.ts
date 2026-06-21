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
      invalidate();
      return data;
    },
  });
}

export function useAddConsumption() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (vars: { customerId: string; consumption_kwh: number }) => {
      const { data } = await apiLong.post(endpoints.addConsumption(vars.customerId), {
        consumption_kwh: vars.consumption_kwh,
      });
      invalidate();
      return data;
    },
  });
}

export function useAdvanceMonth() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiLong.post(endpoints.advanceMonth, {});
      invalidate();
      return data;
    },
  });
}

export interface BulkUploadResult {
  message: string;
  year: number;
  month: number;
  rows_inserted: number;
  rows_updated: number;
  rows_skipped: number;
  skipped_ids: string[];
  records_analyzed: number | null;
}

export function useBulkUpload() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: async (vars: { year: number; month: number; file: File }): Promise<BulkUploadResult> => {
      const form = new FormData();
      form.append("year", String(vars.year));
      form.append("month", String(vars.month));
      form.append("file", vars.file);
      const { data } = await apiLong.post(endpoints.bulkUpload, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      invalidate();
      return data;
    },
  });
}
