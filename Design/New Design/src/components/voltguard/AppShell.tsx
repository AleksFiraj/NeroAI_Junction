import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutGrid, Map, Users, Search, Settings, HelpCircle, Bell, Radio, Zap } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutGrid },
  { to: "/heatmap", label: "Heatmap", icon: Map },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/inspector", label: "Inspector", icon: Search },
] as const;

export function AppShell({
  eyebrow,
  title,
  children,
  headerRight,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  headerRight?: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-5 pt-5 pb-8">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
              <Zap className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-lg font-extrabold leading-none tracking-tight">Nero AI</div>
              <div className="mono mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Fraud Engine
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pb-2">
          <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Operations
          </div>
        </div>

        <nav className="flex-1 px-3">
          {nav.map((item) => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-primary/15 text-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                ].join(" ")}
              >
                {active && (
                  <span className="absolute -right-3 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                )}
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <Settings className="h-4 w-4" /> Settings
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
            <HelpCircle className="h-4 w-4" /> Help
          </button>
          <div className="mt-3 flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-[--color-success] shadow-[0_0_8px_var(--color-success)]" />
            <span className="mono">ML pipeline online</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <header className="flex items-center justify-between gap-4 px-8 pt-7 pb-6">
          <div>
            <div className="mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {eyebrow}
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {headerRight}
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
