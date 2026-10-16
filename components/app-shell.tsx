"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { TopGlobalBar } from "./top-global-bar";
import { DataProvenanceBar } from "./data-provenance-bar";
import { useResearchContext } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const ctx = useResearchContext();
  const theme = ctx.theme;
  const open = ctx.sidebarOpen;

  React.useEffect(() => {
    const el = document.documentElement;
    if (theme === "light") el.classList.remove("dark");
    else el.classList.add("dark");
  }, [theme]);

  return (
    <div className="flex min-h-screen bg-bg">
      {/* 移动端遮罩 */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => ctx.set({ sidebarOpen: false })}
        />
      )}
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopGlobalBar />
        <main className="flex-1 p-4 overflow-x-hidden">{children}</main>
        <DataProvenanceBar />
      </div>
    </div>
  );
}
