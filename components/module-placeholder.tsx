import * as React from "react";

export function ModulePlaceholder({
  title,
  phase,
  description,
  scope,
}: {
  title: string;
  phase: string;
  description: string;
  scope: string[];
}) {
  return (
    <div className="max-w-3xl mx-auto py-10">
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-xl font-semibold text-content">{title}</h1>
          <span className="chip bg-accent/10 text-accent">{phase}</span>
        </div>
        <p className="text-sm text-muted mb-5">{description}</p>
        <div className="section-title mb-2">本模块规划内容</div>
        <ul className="space-y-1.5">
          {scope.map((s) => (
            <li key={s} className="text-xs text-content flex gap-2">
              <span className="text-accent">•</span>
              {s}
            </li>
          ))}
        </ul>
        <p className="text-2xs text-warn mt-5">
          当前为占位页，完整交互与图表将在对应阶段交付。全部数据为 Mock。
        </p>
      </div>
    </div>
  );
}
