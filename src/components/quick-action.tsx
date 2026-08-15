import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

export function QuickAction({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex h-9 items-center gap-2 rounded-xl border border-[rgba(232,201,120,0.16)] bg-[rgba(255,255,255,0.72)] px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md transition-[border-color,background,transform] duration-150 hover:border-[rgba(232,201,120,0.32)] hover:bg-[rgba(255,255,255,0.88)] active:scale-[0.98]"
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[rgba(232,201,120,0.28)] bg-gradient-to-b from-[rgba(245,213,106,0.18)] to-[rgba(245,166,35,0.06)] text-[#D4AF37] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
        <Icon size={13} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#1c1810]">{label}</span>
      <ChevronRight
        size={14}
        strokeWidth={1.5}
        className="shrink-0 text-[#CBD5E1] group-hover:text-[#D4AF37]"
      />
    </Link>
  );
}
