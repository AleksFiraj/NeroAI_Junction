import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useAddConsumption } from "../../hooks/useAdmin";
import { MINT } from "../../lib/risk";

export function NewReadingForm({ customerId }: { customerId: string }) {
  const [value, setValue] = useState("");
  const add = useAddConsumption();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kwh = Number(value);
    if (!kwh || kwh <= 0) return;
    try {
      await add.mutateAsync({ customerId, consumption_kwh: kwh });
      setValue("");
    } catch {
      // keep the entered value so the inspector can retry
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-base font-semibold">Add next-month reading</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Stored and used to retrain the detection model.
      </p>
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min="1"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Consumption"
            disabled={add.isPending}
            className="w-full rounded-xl border border-border bg-background/40 py-2.5 pl-3 pr-12 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
            kWh
          </span>
        </div>
        <button
          type="submit"
          disabled={add.isPending}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {add.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          )}
          Add
        </button>
      </form>

      <AnimatePresence>
        {add.isPending && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 text-xs text-muted-foreground"
          >
            Storing reading and retraining the model...
          </motion.p>
        )}
        {add.isSuccess && !add.isPending && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex items-center gap-1.5 text-xs"
            style={{ color: MINT }}
          >
            <Check className="h-3 w-3" strokeWidth={3} /> Reading stored and model retrained.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
