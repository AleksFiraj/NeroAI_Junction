import { useLocation } from "react-router-dom";
import { Bell, Radio } from "lucide-react";

const titles: Array<{ match: (path: string) => boolean; title: string; subtitle: string }> = [
  {
    match: (p) => p.startsWith("/dashboard"),
    title: "Command Center",
    subtitle: "Tirana grid fraud overview",
  },
  {
    match: (p) => p.startsWith("/customers/"),
    title: "Customer Investigation",
    subtitle: "Anomaly evidence and explainability",
  },
  {
    match: (p) => p === "/customers" || p.startsWith("/customers?"),
    title: "Customers",
    subtitle: "Browse and search the customer base",
  },
  {
    match: (p) => p.startsWith("/heatmap"),
    title: "Geographic Intelligence",
    subtitle: "Tirana risk heatmap",
  },
  {
    match: (p) => p.startsWith("/inspector"),
    title: "Field Inspector",
    subtitle: "Risk-ranked inspection queue",
  },
];

export function TopBar() {
  const { pathname } = useLocation();
  const meta = titles.find((t) => t.match(pathname)) ?? titles[0];

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface-1/80 px-6 backdrop-blur-md">
      <div className="leading-tight">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-text-subtle">
          {meta.title}
        </p>
        <p className="text-[14px] font-medium text-text">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="hidden items-center gap-1.5 rounded-md border border-safe/25 bg-safe/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-safe lg:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-safe" />
          Backend connected
        </span>
        <button
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-surface-2 hover:text-text"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          aria-label="Live status"
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-subtle transition-colors hover:bg-surface-2 hover:text-text"
        >
          <Radio className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
