import { NavLink, useLocation } from "react-router-dom";
import {
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  Map,
  Settings,
  Users,
  Zap,
} from "lucide-react";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/heatmap", label: "Heatmap", icon: Map },
  { to: "/customers", label: "Customers", icon: Users, matchPrefix: "/customers" },
  { to: "/inspector", label: "Inspector", icon: ClipboardList },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface-1">
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15">
          <Zap className="h-3.5 w-3.5 text-accent" strokeWidth={2.5} />
        </div>
        <div className="leading-tight">
          <h1 className="text-[14px] font-bold tracking-tight text-text">VoltGuard</h1>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-text-subtle">
            Fraud Engine
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3">
        <p className="px-3 pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-text-subtle">
          Operations
        </p>
        <ul className="space-y-0.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = link.matchPrefix
              ? location.pathname.startsWith(link.matchPrefix)
              : location.pathname === link.to;

            return (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={[
                    "group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-surface-2 text-text"
                      : "text-text-muted hover:bg-surface-2/60 hover:text-text",
                  ].join(" ")}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-accent" />
                  )}
                  <Icon
                    className={[
                      "h-4 w-4 shrink-0 transition-colors",
                      isActive ? "text-accent" : "text-text-subtle group-hover:text-text-muted",
                    ].join(" ")}
                    strokeWidth={2}
                  />
                  {link.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-2 py-3">
        <ul className="space-y-0.5">
          {[
            { label: "Settings", icon: Settings },
            { label: "Help", icon: HelpCircle },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button className="group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium text-text-muted transition-colors hover:bg-surface-2/60 hover:text-text">
                  <Icon
                    className="h-4 w-4 shrink-0 text-text-subtle transition-colors group-hover:text-text-muted"
                    strokeWidth={2}
                  />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex items-center gap-2 px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-subtle">
          <span className="h-1.5 w-1.5 rounded-full bg-safe" />
          <span>ML pipeline online</span>
        </div>
      </div>
    </aside>
  );
}
