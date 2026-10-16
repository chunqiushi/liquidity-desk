"use client";

import { PageHeader, NotesPanel, WatchlistPanel, SectionLabel } from "@/components/research-ui";

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        question="研究假设、待办任务、周报与关注清单如何沉淀？如何一键复制基于页面指标的事实摘要？"
        title="研究笔记"
        subtitle="Research Notes · 本地持久化"
      />
      <section className="space-y-3">
        <SectionLabel>笔记与关注</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <NotesPanel />
          <WatchlistPanel />
        </div>
      </section>
    </div>
  );
}
