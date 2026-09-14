import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  right,
  tone = "neon",
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  tone?: "neon" | "cyan" | "alert" | "amber";
  className?: string;
  children: ReactNode;
}) {
  const accent =
    tone === "alert"
      ? "text-alert"
      : tone === "amber"
        ? "text-amber"
        : tone === "cyan"
          ? "text-cyan"
          : "text-neon";
  const bar =
    tone === "alert"
      ? "bg-alert"
      : tone === "amber"
        ? "bg-amber"
        : tone === "cyan"
          ? "bg-cyan"
          : "bg-neon";
  return (
    <section className={cn("panel relative overflow-hidden rounded-sm", className)}>
      <div className={cn("absolute left-0 top-0 h-full w-[3px]", bar)} />
      <header className="flex items-start justify-between gap-3 border-b border-border/60 px-4 py-2.5">
        <div>
          <div className={cn("font-mono text-[11px] uppercase tracking-[0.28em]", accent)}>{title}</div>
          {subtitle && <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>}
        </div>
        {right}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function KV({ k, v, tone }: { k: string; v: ReactNode; tone?: "neon" | "cyan" | "alert" }) {
  const color = tone === "alert" ? "text-alert" : tone === "cyan" ? "text-cyan" : tone === "neon" ? "text-neon" : "text-foreground";
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/40 py-1.5 last:border-0">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</span>
      <span className={cn("truncate font-mono text-sm", color)}>{v}</span>
    </div>
  );
}
