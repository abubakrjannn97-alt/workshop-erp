import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";

export function BackButton({
  href,
  label,
  className = "ui-header-icon",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link href={href} className={className} aria-label={label} scroll={false}>
      <ChevronLeft size={22} strokeWidth={ICON_STROKE} aria-hidden />
    </Link>
  );
}
