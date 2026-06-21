import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useBulkUpload, type BulkUploadResult } from "../../hooks/useAdmin";
import { MINT, AMBER } from "../../lib/risk";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();

export function BulkUploadForm({ onClose }: { onClose: () => void }) {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useBulkUpload();

  const handleFile = useCallback((f: File | undefined) => {
    if (!f) return;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "json") return;
    setFile(f);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    try {
      const res = await upload.mutateAsync({ year, month, file });
      setResult(res);
      setFile(null);
    } catch {
      // error handled by mutation state
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold">Bulk data upload</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Upload a CSV or JSON file with consumption readings for the new month.
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-4">
        {/* Month + Year row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Month <span className="text-red-400">*</span>
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            >
              {MONTHS.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Year <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={2020}
              max={2030}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-xl border border-border bg-background/40 px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* File drop zone */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            File <span className="text-red-400">*</span>
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={[
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : file
                  ? "border-primary/40 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/30",
            ].join(" ")}
          >
            {file ? (
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drop file here or <span className="font-medium text-primary">browse</span>
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  CSV or JSON with columns: customer_id, consumption_kwh
                </p>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!file || upload.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {upload.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {upload.isPending ? "Uploading & retraining..." : "Upload bulk data"}
        </button>
      </form>

      {/* Feedback */}
      <AnimatePresence>
        {upload.isPending && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 text-xs text-muted-foreground"
          >
            Processing file and retraining the detection model...
          </motion.p>
        )}

        {result && !upload.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 space-y-2 rounded-xl border border-border bg-background/40 p-4"
          >
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: MINT }}>
              <Check className="h-4 w-4" strokeWidth={3} />
              {result.message}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 py-2">
                <div className="text-lg font-bold">{result.rows_inserted}</div>
                <div className="text-[10px] text-muted-foreground">Inserted</div>
              </div>
              <div className="rounded-lg bg-muted/50 py-2">
                <div className="text-lg font-bold">{result.rows_updated}</div>
                <div className="text-[10px] text-muted-foreground">Updated</div>
              </div>
              <div className="rounded-lg bg-muted/50 py-2">
                <div className="text-lg font-bold" style={{ color: result.rows_skipped > 0 ? AMBER : undefined }}>
                  {result.rows_skipped}
                </div>
                <div className="text-[10px] text-muted-foreground">Skipped</div>
              </div>
            </div>
            {result.skipped_ids.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: AMBER }} />
                <p className="text-[11px] text-muted-foreground">
                  Skipped IDs: {result.skipped_ids.join(", ")}
                </p>
              </div>
            )}
            {result.records_analyzed && (
              <p className="text-[11px] text-muted-foreground">
                Model retrained on {result.records_analyzed.toLocaleString()} records.
              </p>
            )}
          </motion.div>
        )}

        {upload.isError && !upload.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-center gap-2 text-xs text-red-400"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            {(upload.error as any)?.response?.data?.detail ?? "Upload failed. Please try again."}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
