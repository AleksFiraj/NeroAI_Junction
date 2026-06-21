import { Info } from "lucide-react";
import { useId, useState } from "react";

const LABEL_TONE: Record<string, string> = {
  "High priority investigation": "#EF4444",
  "High-risk behavior, moderate loss": "#F59E0B",
  "Moderate financial risk": "#F59E0B",
  "Low financial impact anomaly": "#10B981",
  "Behavioral anomaly under review": "#10B981",
  "Within normal range": "#6B7280",
};

/**
 * Small info affordance shown beside an estimated-loss figure. The icon itself
 * acts as the label: hovering (or focusing) it reveals the classification that
 * explains how the financial impact relates to the behavioral risk score.
 */
export function LossTooltip({ label }: { label?: string | null }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const text = label && label.trim().length > 0 ? label : "Estimated financial impact";
  const tone = LABEL_TONE[text] ?? "#6B7280";

  return (
    <span className="relative inline-flex items-center align-middle">
      <button
        type="button"
        aria-label={text}
        aria-describedby={open ? tooltipId : undefined}
        className="inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-[10000] mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-[11px] font-medium shadow-lg"
          style={{ color: tone }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
