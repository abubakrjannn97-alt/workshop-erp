import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, CircleAlert, Wallet } from "lucide-react";
import { StatisticsCard } from "@/components/dashboard/StatisticsCards";
import type { StatisticsCardAccent, StatisticsCardTrend } from "@/components/dashboard/StatisticsCards";

export type KpiTone = "in" | "out" | "ink";

function accentFromTone(tone: KpiTone): StatisticsCardAccent {
  if (tone === "out") return "red";
  if (tone === "in") return "gold";
  return "blue";
}

export function KpiCard({
  label,
  value,
  href,
  hint,
  trend,
  highlight,
  danger,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  href?: string;
  hint?: string;
  trend?: number | null;
  highlight?: boolean;
  danger?: boolean;
  tone?: KpiTone;
  icon?: LucideIcon;
  hero?: string;
  variant?: string;
}) {
  const kind: KpiTone = tone ?? (danger ? "out" : highlight ? "in" : "ink");
  const Fallback = kind === "out" ? CircleAlert : kind === "in" ? TrendingUp : Wallet;
  const Glyph = Icon ?? Fallback;
  const trendData: StatisticsCardTrend | undefined =
    typeof trend === "number" && Number.isFinite(trend)
      ? {
          value: `${Math.abs(trend).toFixed(Math.abs(trend) >= 10 ? 0 : 1)}%`,
          direction: trend > 0 ? "up" : trend < 0 ? "down" : "neutral",
          label: "",
        }
      : undefined;

  const card = (
    <StatisticsCard
      title={label}
      value={value}
      subtitle={hint ?? ""}
      icon={<Glyph size={15} strokeWidth={1.6} aria-hidden />}
      accent={accentFromTone(kind)}
      trend={trendData}
      hideMenu={Boolean(href)}
    />
  );

  if (href) {
    return (
      <Link href={href} className="block min-w-0">
        {card}
      </Link>
    );
  }
  return card;
}
