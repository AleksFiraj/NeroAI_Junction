import type { PropsWithChildren } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg text-text">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
