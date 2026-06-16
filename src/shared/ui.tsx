import type { ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Pill({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.28em] text-sky-900",
        className
      )}
    >
      {children}
    </span>
  );
}

export function SoftCard({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cx("glass-panel rounded-3xl p-4", className)}>
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  className
}: {
  title: string;
  subtitle?: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={cx("space-y-1", className)}>
      <h2 className="text-sm font-extrabold tracking-wide text-slate-950">{title}</h2>
      {subtitle ? <p className="text-xs font-semibold leading-5 text-slate-700">{subtitle}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  color = "from-cyan-400 to-emerald-400"
}: {
  value: number;
  color?: string;
}): JSX.Element {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div
        className={cx("h-full rounded-full bg-gradient-to-r", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
