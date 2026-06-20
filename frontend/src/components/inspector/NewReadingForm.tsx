import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useAddConsumption } from "../../hooks/useAdmin";

export function NewReadingForm({ customerId }: { customerId: string }) {
  const [value, setValue] = useState("");
  const add = useAddConsumption();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const kwh = Number(value);
    if (!kwh || kwh <= 0) return;
    add.mutate(
      { customerId, consumption_kwh: kwh },
      { onSuccess: () => setValue("") },
    );
  };

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-5">
      <h3 className="text-[13px] font-semibold text-text">Add next-month reading</h3>
      <p className="mt-1 text-[11.5px] text-text-subtle">
        Stored and used to retrain the detection model.
      </p>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min="1"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Consumption"
            disabled={add.isPending}
            className="w-full rounded-md border border-border bg-surface-2 py-2 pl-3 pr-12 text-[13px] text-text placeholder:text-text-subtle focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-subtle">
            kWh
          </span>
        </div>
        <button
          type="submit"
          disabled={add.isPending}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-accent bg-accent px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
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
            className="mt-2 text-[11.5px] text-text-muted"
          >
            Storing reading and retraining the model...
          </motion.p>
        )}
        {add.isSuccess && !add.isPending && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-2 flex items-center gap-1.5 text-[11.5px] text-safe"
          >
            <Check className="h-3 w-3" strokeWidth={3} /> Reading stored and model retrained.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
