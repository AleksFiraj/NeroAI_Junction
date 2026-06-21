import { NavLink, useLocation } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LayoutGrid,
  Map,
  Radio,
  Search,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { type ReactNode, useState } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/heatmap", label: "Heatmap", icon: Map },
  { to: "/customers", label: "Customers", icon: Users, matchPrefix: "/customers" },
  { to: "/inspector", label: "Inspector", icon: Search },
] as const;

const titles: Array<{
  match: (path: string) => boolean;
  eyebrow: string;
  title: string;
}> = [
  { match: (p) => p.startsWith("/dashboard"), eyebrow: "Command Center", title: "Tirana grid fraud overview" },
  { match: (p) => p.startsWith("/customers/"), eyebrow: "Customer Investigation", title: "Anomaly evidence and explainability" },
  { match: (p) => p === "/customers" || p.startsWith("/customers?"), eyebrow: "Customers", title: "Browse and search the customer base" },
  { match: (p) => p.startsWith("/heatmap"), eyebrow: "Geographic Intelligence", title: "Tirana risk heatmap" },
  { match: (p) => p.startsWith("/inspector"), eyebrow: "Field Inspector", title: "Risk-ranked inspection queue" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const meta = titles.find((t) => t.match(pathname)) ?? titles[0];
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      {/* Fixed Sidebar */}
      <aside
        className="hidden md:flex fixed top-0 left-0 h-screen flex-col border-r border-sidebar-border bg-sidebar z-40 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out"
        style={{ width: sidebarWidth }}
      >
        <div className={`flex items-center ${collapsed ? "justify-center px-2" : "justify-between px-5"} pt-5 pb-8`}>
          <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <Zap className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div>
                <div className="text-lg font-extrabold leading-none tracking-tight">Nero AI</div>
                <div className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Fraud Engine
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors ${collapsed ? "mt-2" : ""}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="px-5 pb-2">
            <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Operations
            </div>
          </div>
        )}

        <nav className="flex-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive =
              "matchPrefix" in item
                ? pathname.startsWith(item.matchPrefix!)
                : item.to === "/dashboard"
                  ? pathname === "/dashboard" || pathname === "/"
                  : pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={[
                  "group relative flex items-center rounded-lg py-2.5 text-sm transition-colors",
                  collapsed ? "justify-center px-2" : "gap-3 px-3",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                ].join(" ")}
              >
                {isActive && (
                  <span className="absolute -right-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button
            title={collapsed ? "Settings" : undefined}
            className={`flex w-full items-center rounded-lg py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}
          >
            <Settings className="h-4 w-4 shrink-0" /> {!collapsed && "Settings"}
          </button>
          <button
            title={collapsed ? "Help" : undefined}
            className={`flex w-full items-center rounded-lg py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}
          >
            <HelpCircle className="h-4 w-4 shrink-0" /> {!collapsed && "Help"}
          </button>
          <div className={`mt-3 flex items-center gap-2 py-2 text-xs text-muted-foreground ${collapsed ? "justify-center px-0" : "px-3"}`}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-[--color-success] shadow-[0_0_8px_var(--color-success)]" />
            {!collapsed && <span className="mono">ML pipeline online</span>}
          </div>
        </div>
      </aside>

      {/* Main — offset by sidebar width */}
      <main
        className="min-w-0 transition-all duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth }}
      >
        <header className="flex items-center justify-between gap-4 px-8 pt-7 pb-6">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {meta.eyebrow}
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{meta.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-[--color-success]/30 bg-[--color-success]/10 px-3 py-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[--color-success] shadow-[0_0_8px_var(--color-success)]" />
              <span className="text-foreground/90">Backend connected</span>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground">
              <Radio className="h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="px-8 pb-12">{children}</div>
      </main>
    </div>
  );
}
