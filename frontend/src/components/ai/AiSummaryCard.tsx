import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { useAiSummary } from "../../hooks/useAi";
import { AMBER } from "../../lib/risk";

export function AiSummaryCard({ customerId }: { customerId: string }) {
  const summary = useAiSummary(customerId);

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4" style={{ color: AMBER }} />
          AI investigation summary
        </div>
        <button
          onClick={() => summary.refetch()}
          disabled={summary.isFetching}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{
            color: AMBER,
            background: `${AMBER}1F`,
          }}
        >
          {summary.isFetching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
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
            className="mt-3 rounded-xl border border-border bg-background/40 p-4 text-[12.5px] leading-relaxed"
          >
            {summary.data.summary}
          </motion.p>
        ) : (
          <motion.p
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm italic text-muted-foreground"
          >
            Generate a concise, data-grounded brief of the most important findings.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
