"use client";

import * as React from "react";
import { Sun, Moon, Filter } from "lucide-react";
import { useResearchContext } from "@/lib/store";
import { CURRENCIES } from "@/lib/mock-data";
import { Button } from "./ui";
import { cn, fmtDate } from "@/lib/utils";

function Select({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-0.5", className)}>
      <span className="text-2xs text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-panel-2 border border-border rounded text-2xs px-2 py-1 text-content focus:outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ResearchContextBar() {
  const ctx = useResearchContext();
  const [open, setOpen] = React.useState(false);

  const dateInput = (label: string, key: "asOfDate" | "vintageDate") => (
    <label className="flex flex-col gap-0.5">
      <span className="text-2xs text-muted">{label}</span>
      <input
        type="date"
        value={ctx[key]}
        onChange={(e) => ctx.set({ [key]: e.target.value })}
        className="bg-panel-2 border border-border rounded text-2xs px-2 py-1 text-content focus:outline-none focus:border-accent"
      />
    </label>
  );

  return (
    <div className="border-b border-border bg-panel sticky top-0 z-20">
      <div className="flex items-center gap-3 px-4 py-2 flex-wrap">
        {dateInput("As-of Date", "asOfDate")}
        {dateInput("Vintage Date", "vintageDate")}
        <Select
          label="Currency"
          value={ctx.currency}
          onChange={(v) => ctx.set({ currency: v })}
          options={[
            { value: "ALL", label: "All" },
            ...CURRENCIES.map((c) => ({ value: c.code, label: c.code })),
          ]}
        />
        <Select
          label="Lookback"
          value={ctx.lookback}
          onChange={(v) => ctx.set({ lookback: v })}
          options={[
            { value: "1M", label: "1M" },
            { value: "3M", label: "3M" },
            { value: "6M", label: "6M" },
            { value: "1Y", label: "1Y" },
            { value: "3Y", label: "3Y" },
            { value: "5Y", label: "5Y" },
          ]}
        />
        <Select
          label="Frequency"
          value={ctx.frequency}
          onChange={(v) => ctx.set({ frequency: v })}
          options={[
            { value: "Daily", label: "Daily" },
            { value: "Weekly", label: "Weekly" },
            { value: "Monthly", label: "Monthly" },
            { value: "Quarterly", label: "Quarterly" },
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="xs" onClick={() => setOpen((o) => !o)}>
            <Filter size={13} /> More
          </Button>
          <Button variant="ghost" size="xs" onClick={ctx.toggleTheme}>
            {ctx.theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="flex items-end gap-3 px-4 pb-3 flex-wrap border-t border-border pt-3">
          <Select
            label="Region"
            value={ctx.region}
            onChange={(v) => ctx.set({ region: v })}
            options={[
              { value: "ALL", label: "All" },
              { value: "North America", label: "North America" },
              { value: "Eurozone", label: "Eurozone" },
              { value: "Asia", label: "Asia" },
              { value: "Europe", label: "Europe" },
              { value: "Asia-Pacific", label: "Asia-Pacific" },
            ]}
          />
          <Select
            label="Asset Class"
            value={ctx.assetClass}
            onChange={(v) => ctx.set({ assetClass: v })}
            options={[
              { value: "ALL", label: "All" },
              { value: "Policy", label: "Policy" },
              { value: "Rates", label: "Rates" },
              { value: "Curve", label: "Curve" },
              { value: "Funding", label: "Funding" },
              { value: "FX", label: "FX" },
              { value: "Liquidity", label: "Liquidity" },
            ]}
          />
          <Select
            label="Data Source"
            value={ctx.dataSource}
            onChange={(v) => ctx.set({ dataSource: v })}
            options={[{ value: "ALL", label: "All" }, { value: "Mock", label: "Mock" }]}
          />
          <Select
            label="Data Status"
            value={ctx.dataStatus}
            onChange={(v) => ctx.set({ dataStatus: v })}
            options={[
              { value: "ALL", label: "All" },
              { value: "Actual", label: "Actual" },
              { value: "Estimate", label: "Estimate" },
              { value: "Revised", label: "Revised" },
              { value: "Missing", label: "Missing" },
            ]}
          />
          <Select
            label="Method Version"
            value={ctx.methodVersion}
            onChange={(v) => ctx.set({ methodVersion: v })}
            options={[{ value: "v0.1", label: "v0.1" }]}
          />
          <div className="text-2xs text-muted self-center">
            As-of {fmtDate(ctx.asOfDate)} · Vintage {fmtDate(ctx.vintageDate)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
