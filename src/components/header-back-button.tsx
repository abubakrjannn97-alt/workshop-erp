"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { resolveBackHref } from "@core/shared/back-nav";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";

export function HeaderBackButton({
  locale,
  href,
  className = "ui-header-icon max-lg:hidden",
}: {
  locale: Locale;
  href?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const backHref = href ?? resolveBackHref(pathname);
  if (!backHref) return null;
  const t = createT(locale);
  return <BackButton href={backHref} label={t("common.back")} className={className} />;
}
