import { AnimatePresence, motion } from "framer-motion";
import { CalendarPlus, CheckCircle2, Loader2, ShieldX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CustomerProfile } from "../components/customer/CustomerProfile";
import { InspectorNotes } from "../components/inspector/InspectorNotes";
import { NewReadingForm } from "../components/inspector/NewReadingForm";
import { useAdvanceMonth, useReviewCustomer } from "../hooks/useAdmin";
import { useCustomers } from "../hooks/useCustomers";
import { riskColor } from "../lib/risk";

export function InspectorPage() {
  const { data } = useCustomers();
  const advance = useAdvanceMonth();
  const review = useReviewCustomer();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queue = useMemo(
    () =>
      (data ?? [])
        .filter(
          (c) =>
            c.review_status === "open" &&
            (c.status === "Critical" || c.status === "Suspicious"),
        )
        .sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0)),
    [data],
  );

  useEffect(() => {
    if (!selectedId && queue.length) setSelectedId(queue[0].customer_id);
    if (selectedId && !queue.find((c) => c.customer_id === selectedId)) {
      setSelectedId(queue[0]?.customer_id ?? null);
    }
  }, [queue, selectedId]);

  const handleReview = (status: "fraud" | "resolved") => {
    if (!selectedId) return;
    review.mutate({ customerId: selectedId, status });
  };

  return (
    <div className="space-y-4">
      {/* Admin bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 px-5 py-3">
        <div>
          <h3 className="text-[13px] font-semibold text-text">Inspection queue</h3>
          <p className="text-[11.5px] text-text-subtle">{queue.length} open high-risk cases</p>
        </div>
        <button
          onClick={() => advance.mutate()}
          disabled={advance.isPending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface-2 px-3 text-[12.5px] font-medium text-text transition-colors hover:bg-surface-3 disabled:opacity-60"
        >
          {advance.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <CalendarPlus className="h-3.5 w-3.5" strokeWidth={2} />
          )}
          {advance.isPending ? "Advancing + retraining..." : "Advance month (all customers)"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Queue */}
        <div className="rounded-xl border border-border bg-surface-1">
          <div className="max-h-[78vh] divide-y divide-border/60 overflow-y-auto">
            {queue.map((c) => {
              const active = c.customer_id === selectedId;
              return (
                <button
                  key={c.customer_id}
                  onClick={() => setSelectedId(c.customer_id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    active ? "bg-surface-2" : "hover:bg-surface-2/50"
                  }`}
                >
                  <span
                    className="h-8 w-1 rounded-full"
                    style={{ background: riskColor(c.risk_score) }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-text">{c.name}</p>
                    <p className="truncate text-[11px] text-text-subtle">{c.district}</p>
                  </div>
                  <span
                    className="font-mono text-[13px] font-semibold tabular"
                    style={{ color: riskColor(c.risk_score) }}
                  >
                    {Math.round(c.risk_score ?? 0)}
                  </span>
                </button>
              );
            })}
            {queue.length === 0 && (
              <p className="px-4 py-8 text-center text-[12px] text-text-subtle">
                Queue is clear. No open high-risk cases.
              </p>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {selectedId ? (
              <motion.div
                key={selectedId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                <CustomerProfile
                  customerId={selectedId}
                  actions={
                    <>
                      <button
                        onClick={() => handleReview("fraud")}
                        disabled={review.isPending}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-critical/40 bg-critical/10 px-3 text-[12px] font-medium text-critical transition-colors hover:bg-critical/20 disabled:opacity-60"
                      >
                        <ShieldX className="h-3.5 w-3.5" strokeWidth={2} />
                        Mark fraud
                      </button>
                      <button
                        onClick={() => handleReview("resolved")}
                        disabled={review.isPending}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-safe/40 bg-safe/10 px-3 text-[12px] font-medium text-safe transition-colors hover:bg-safe/20 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                        Resolve
                      </button>
                    </>
                  }
                />
                <InspectorNotes customerId={selectedId} />
                <NewReadingForm customerId={selectedId} />
              </motion.div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-surface-1 text-[13px] text-text-subtle">
                Select a case from the queue.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
