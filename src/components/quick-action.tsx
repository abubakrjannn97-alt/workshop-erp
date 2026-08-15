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
      className="group flex h-8 items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-2 transition-colors hover:border-[#D4AF37]/40 hover:bg-[#FAFBFC]"
    >
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]">
        <Icon size={12} strokeWidth={1.6} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#101828]">{label}</span>
      <ChevronRight
        size={14}
        strokeWidth={1.5}
        className="shrink-0 text-[#CBD5E1] group-hover:text-[#D4AF37]"
      />
    </Link>
  );
}
