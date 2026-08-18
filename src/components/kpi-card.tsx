import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { StatisticsCard } from "@/components/dashboard/StatisticsCards";
import { ICON_STROKE } from "@/components/nav-icons";

export type KpiTone = "in" | "out" | "ink";

export function KpiCard({
  label,
  value,
  href,
  hint,
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
  const card = (
    <StatisticsCard
      title={label}
      value={value}
      subtitle={hint}
      icon={Icon ? <Icon size={15} strokeWidth={ICON_STROKE} aria-hidden /> : undefined}
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
