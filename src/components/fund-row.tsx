import type { LucideIcon } from "lucide-react";
import {
  Package,
  Users,
  Percent,
  Building2,
  Crown,
  Wallet,
} from "lucide-react";
import { FUND } from "@core/finance/finance";

const FUND_STYLES: Record<string, { icon: LucideIcon; box: string; iconColor: string }> = {
  [FUND.MATERIALS]: {
    icon: Package,
    box: "border-[#3B82F6]/25 bg-[#EFF6FF]",
    iconColor: "text-[#3B82F6]",
  },
  [FUND.LABOR]: {
    icon: Users,
    box: "border-[#F59E0B]/25 bg-[#FFFBEB]",
    iconColor: "text-[#F59E0B]",
  },
  [FUND.COMMISSION]: {
    icon: Percent,
    box: "border-[#8B5CF6]/25 bg-[#F5F3FF]",
    iconColor: "text-[#8B5CF6]",
  },
  [FUND.OPEX]: {
    icon: Building2,
    box: "border-[#EF4444]/25 bg-[#FEF2F2]",
    iconColor: "text-[#EF4444]",
  },
  [FUND.PROFIT]: {
    icon: Crown,
    box: "border-[#D4AF37]/30 bg-[#D4AF37]/10",
    iconColor: "text-[#D4AF37]",
  },
};

export function FundRow({
  code,
  label,
  amount,
  highlight,
}: {
  code: string;
  label: string;
  amount: string;
  highlight?: boolean;
}) {
  const style = FUND_STYLES[code] ?? { icon: Wallet, box: "border-[#E5E7EB] bg-[#F9FAFB]", iconColor: "text-[#667085]" };
  const Icon = style.icon;

  return (
    <li className="ui-list-row ui-fund-row flex min-h-[44px] items-center gap-3">
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${style.box}`}>
        <Icon size={14} strokeWidth={1.7} className={style.iconColor} />
      </span>
      <span className={`min-w-0 flex-1 truncate text-[13px] leading-snug ${highlight ? "font-semibold text-[#D4AF37]" : "font-medium text-[#101828]"}`}>
        {label}
      </span>
      <span className={`shrink-0 font-mono text-[13px] tabular-nums ${highlight ? "font-semibold text-[#D4AF37]" : "font-semibold text-[#101828]"}`}>
        {amount}
      </span>
    </li>
  );
}
