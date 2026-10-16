import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("card", className)}>{children}</div>;
}

export function CardHead({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="card-head">
      <div>
        <div className="text-sm font-semibold">{title}</div>
        {subtitle ? (
          <div className="text-2xs text-muted mt-0.5">{subtitle}</div>
        ) : null}
      </div>
      {right}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "pos" | "neg" | "warn" | "mock";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-panel-2 text-muted border border-border",
    accent: "bg-accent/10 text-accent border border-accent/30",
    pos: "bg-pos/10 text-pos border border-pos/30",
    neg: "bg-neg/10 text-neg border border-neg/30",
    warn: "bg-warn/10 text-warn border border-warn/30",
    mock: "bg-warn/10 text-warn border border-warn/40",
  };
  return <span className={cn("chip", tones[tone], className)}>{children}</span>;
}

export function DataStatusBadge({
  status,
}: {
  status?: string;
}) {
  if (!status) return null;
  if (status === "Mock Data")
    return <Badge tone="mock">Mock</Badge>;
  if (status === "Real Data") return <Badge tone="pos">Real Data</Badge>;
  if (status === "Actual") return <Badge tone="pos">Actual</Badge>;
  if (status === "Estimate") return <Badge tone="warn">Estimate</Badge>;
  if (status === "Revised") return <Badge tone="accent">Revised</Badge>;
  if (status === "Missing" || status === "Data Pending" || status === "N/A")
    return <Badge tone="neg">{status}</Badge>;
  return <Badge tone="neutral">{status}</Badge>;
}

export function Button({
  children,
  variant = "default",
  size = "sm",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "ghost";
  size?: "sm" | "xs";
}) {
  const variants: Record<string, string> = {
    default: "bg-panel-2 text-content border border-border hover:bg-border/40",
    primary: "bg-accent text-accent-fg border border-accent hover:opacity-90",
    ghost: "bg-transparent text-muted hover:text-content hover:bg-panel-2",
  };
  const sizes: Record<string, string> = {
    xs: "text-2xs px-2 py-1",
    sm: "text-xs px-2.5 py-1.5",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 rounded font-medium transition-colors",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("section-title mb-2", className)}>{children}</div>;
}

export function EmptyOrPending({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-24 text-2xs text-muted border border-dashed border-border rounded">
      {label ?? "Data Pending — interface reserved, source not yet wired"}
    </div>
  );
}
