"use client";

import * as React from "react";
import { CURRENCIES, NEWS, UPCOMING_EVENTS } from "@/lib/mock-data";
import { useResearchContext, useResearchData } from "@/lib/store";
import { Card, CardHead, Badge, DataStatusBadge, Button, SectionLabel } from "@/components/ui";
import { fmtDate, fmtDateTime, cn } from "@/lib/utils";
import { Priority, RESEARCH_STATUS, ResearchStatus } from "@/lib/types";

function EventsCalendar() {
  const ctx = useResearchContext();
  const evs = UPCOMING_EVENTS.filter((e) => ctx.currency === "ALL" || e.currency === ctx.currency || e.currency === "GLOBAL");
  const groups: Priority[] = ["P0", "P1", "P2"];
  const tone: Record<Priority, "neg" | "warn" | "neutral"> = { P0: "neg", P1: "warn", P2: "neutral" };
  return (
    <Card>
      <CardHead title="Events Calendar" subtitle={`${evs.length} events · filter via top bar currency`} />
      <div className="p-3 space-y-3">
        {groups.map((g) => {
          const items = evs.filter((e) => e.priority === g);
          if (!items.length) return null;
          return (
            <div key={g}>
              <Badge tone={tone[g]}>{g}</Badge>
              <div className="mt-1 space-y-1">
                {items.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-2xs border-b border-border/40 pb-1">
                    <span>
                      <span className="font-semibold">{fmtDate(e.date)}</span> · {e.title}
                      <span className="text-muted ml-1">({e.currency})</span>
                    </span>
                    <span className="text-muted">{e.kind}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ResearchTasks() {
  const data = useResearchData();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    title: "",
    researchQuestion: "",
    hypothesis: "",
    currency: "USD",
    priority: "P1" as Priority,
    status: "Idea" as ResearchStatus,
    nextAction: "",
  });

  return (
    <Card>
      <CardHead
        title="Research Tasks"
        subtitle={`${data.tasks.length} tasks · hypotheses and tasks are modeled separately`}
        right={<Button variant="primary" size="xs" onClick={() => setOpen((o) => !o)}>{open ? "Close" : "New task"}</Button>}
      />
      <div className="p-3 space-y-2">
        {open ? (
          <div className="border border-border rounded p-2 space-y-2 mb-2">
            <input className="w-full bg-panel-2 border border-border rounded text-2xs p-1.5" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="w-full bg-panel-2 border border-border rounded text-2xs p-1.5" placeholder="Research question" value={form.researchQuestion} onChange={(e) => setForm({ ...form, researchQuestion: e.target.value })} />
            <input className="w-full bg-panel-2 border border-border rounded text-2xs p-1.5" placeholder="Hypothesis" value={form.hypothesis} onChange={(e) => setForm({ ...form, hypothesis: e.target.value })} />
            <div className="flex gap-2">
              <select className="bg-panel-2 border border-border rounded text-2xs p-1.5" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <select className="bg-panel-2 border border-border rounded text-2xs p-1.5" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                {(["P0", "P1", "P2"] as Priority[]).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="bg-panel-2 border border-border rounded text-2xs p-1.5" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ResearchStatus })}>
                {RESEARCH_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="xs" onClick={() => { if (form.title.trim()) { data.addTask({ ...form, assetClass: "Rates", evidence: [], relatedIndicators: [], relatedNews: [], reviewDate: "", conclusion: "", confidence: 0.3, openQuestions: [] }); setForm({ ...form, title: "", researchQuestion: "", hypothesis: "", nextAction: "" }); setOpen(false); } }}>Create</Button>
              <Button size="xs" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-1">
          {data.tasks.map((t) => (
            <div key={t.id} className="text-2xs border border-border rounded p-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-content">{t.title}</span>
                <div className="flex items-center gap-1">
                  <Badge tone={t.priority === "P0" ? "neg" : t.priority === "P1" ? "warn" : "neutral"}>{t.priority}</Badge>
                  <Badge tone="accent">{t.currency}</Badge>
                  <Badge tone="neutral">{t.status}</Badge>
                  <button className="text-muted hover:text-neg ml-1" onClick={() => data.removeTask(t.id)}>✕</button>
                </div>
              </div>
              <div className="text-muted mt-1">Q: {t.researchQuestion}</div>
              <div className="text-content/80">H: {t.hypothesis}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function Hypotheses() {
  const data = useResearchData();
  return (
    <Card>
      <CardHead title="Research Hypotheses" subtitle="Separate from tasks · one task may test many hypotheses" />
      <div className="p-3 space-y-1">
        {data.hypotheses.map((h) => (
          <div key={h.id} className="text-2xs border border-border rounded p-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-content">{h.statement}</span>
              <Badge tone="accent">{h.status}</Badge>
            </div>
            <div className="text-muted mt-1">
              {h.currency} · linked tasks: {h.linkedTasks.join(", ") || "—"}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WeeklyBrief() {
  const data = useResearchData();
  const b = data.brief;
  const [summary, setSummary] = React.useState("");
  return (
    <Card>
      <CardHead
        title="Weekly Brief"
        subtitle="Editable structure · 10 sections · version history"
        right={
          <div className="flex items-center gap-2">
            <Badge tone="warn">{b.status}</Badge>
            <span className="text-2xs text-muted">v{b.version}</span>
          </div>
        }
      />
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          {(["Draft", "Review", "Published", "Archived"] as const).map((s) => (
            <Button key={s} size="xs" variant={b.status === s ? "primary" : "default"} onClick={() => data.updateBrief({ status: s })}>
              {s}
            </Button>
          ))}
          <Button size="xs" onClick={() => data.updateBrief({ version: b.version + 1 })}>Bump version</Button>
        </div>
        <div className="text-2xs text-muted">Executive Summary (editable demo)</div>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Draft the executive summary…"
          className="w-full bg-panel-2 border border-border rounded text-2xs p-2 resize-none focus:outline-none focus:border-accent"
        />
        <div className="text-2xs text-muted">Sections</div>
        <ol className="text-2xs space-y-0.5 list-decimal list-inside text-content/80">
          {b.sections.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <div className="text-2xs text-muted">
          Each chart block will store: Data Query ID, As-of, Vintage, Source, Method Version, Chart Config, Related Research ID (wired in Phase 4).
        </div>
      </div>
    </Card>
  );
}

export default function EventsResearchPage() {
  const allNews = NEWS;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Events &amp; Research</h1>
        <p className="text-2xs text-muted">Central-bank events, macro data, research tasks, hypotheses, notes and the weekly brief</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventsCalendar />
        <Card>
          <CardHead title="Latest News Flow" subtitle={`${allNews.length} items`} />
          <div className="p-3 space-y-1 max-h-[420px] overflow-y-auto">
            {allNews.map((n) => (
              <div key={n.id} className="text-2xs border-b border-border/40 pb-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{n.title}</span>
                  <Badge tone={n.priority === "P0" ? "neg" : n.priority === "P1" ? "warn" : "neutral"}>{n.priority}</Badge>
                </div>
                <div className="text-muted">{n.source} · {fmtDateTime(n.publishedAt)} · {n.currency}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <SectionLabel>Research Workflow</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ResearchTasks />
        <Hypotheses />
      </div>

      <WeeklyBrief />
    </div>
  );
}
