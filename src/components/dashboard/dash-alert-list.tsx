import Link from "next/link";
import { AlertTriangle, Info, CircleAlert } from "lucide-react";
import { RevealList } from "@/components/reveal-list";
import type { DashAlert } from "./owner-alerts";

const TONE = {
  critical: {
    dot: "bg-[var(--color-danger)]",
    icon: CircleAlert,
    iconClass: "text-[var(--color-danger)]",
  },
  warning: {
    dot: "bg-[var(--color-warning,#F59E0B)]",
    icon: AlertTriangle,
    iconClass: "text-[var(--color-warning,#F59E0B)]",
  },
  info: {
    dot: "bg-[var(--color-info,#3B82F6)]",
    icon: Info,
    iconClass: "text-[var(--color-info,#3B82F6)]",
  },
} as const;

export function DashAlertList({
  alerts,
  empty,
  moreLabel,
  lessLabel,
  limit = 5,
}: {
  alerts: DashAlert[];
  empty: string;
  moreLabel: string;
  lessLabel: string;
  limit?: number;
}) {
  if (alerts.length === 0) {
    return <p className="text-[12px] text-[var(--color-text-muted)]">{empty}</p>;
  }

  return (
    <RevealList moreLabel={moreLabel} lessLabel={lessLabel} limit={limit} className="ui-list">
      {alerts.map((a) => {
        const tone = TONE[a.tone];
        const Icon = tone.icon;
        return (
          <li key={a.id}>
            <Link
              href={a.href}
              className="ui-list-row flex min-h-[44px] items-center gap-2 transition-colors hover:bg-[var(--color-surface-soft)]"
            >
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] ${tone.iconClass}`}>
                <Icon size={14} strokeWidth={1.8} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-[var(--color-text-primary)]">{a.title}</span>
                {a.subtitle ? (
                  <span className="block truncate text-[11px] text-[var(--color-text-muted)]">{a.subtitle}</span>
                ) : null}
              </span>
              {a.amount ? (
                <span className="shrink-0 font-mono text-[12px] font-semibold tabular-nums text-[var(--color-danger)]">
                  {a.amount}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </RevealList>
  );
}
