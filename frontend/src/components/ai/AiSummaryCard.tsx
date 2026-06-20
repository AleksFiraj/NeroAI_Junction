import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useAiSummary } from "../../hooks/useAi";

export function AiSummaryCard({ customerId }: { customerId: string }) {
  const summary = useAiSummary(customerId);

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" strokeWidth={2} />
          <h3 className="text-[13px] font-semibold text-text">AI investigation summary</h3>
        </div>
        <button
          onClick={() => summary.refetch()}
          disabled={summary.isFetching}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-accent bg-accent px-3 text-[12px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {summary.isFetching ? (
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
          ) : (
            <Sparkles className="h-3 w-3" strokeWidth={2} />
          )}
          {summary.data ? "Regenerate" : "Summarize"}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {summary.data ? (
          <motion.p
            key="summary"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-md border border-border bg-surface-2/40 p-3 text-[12.5px] leading-relaxed text-text"
          >
            {summary.data.summary}
          </motion.p>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-[12px] italic text-text-subtle"
          >
            Generate a concise, data-grounded brief of the most important findings.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
