"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { useNavBackTarget } from "@/components/use-nav-back-target";

/** Must be rendered inside a React Suspense boundary (uses search params). */
export function BackButton({
  href,
  label,
  className = "ui-header-icon",
}: {
  href: string;
  label: string;
  className?: string;
}) {
  const router = useRouter();
  const target = useNavBackTarget(href || null);

  if (!target) return null;

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      onClick={() => router.push(target)}
    >
      <ChevronLeft size={22} strokeWidth={ICON_STROKE} aria-hidden />
    </button>
  );
}
