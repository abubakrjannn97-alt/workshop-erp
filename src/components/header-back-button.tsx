"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { useNavBackTarget } from "@/components/use-nav-back-target";
import { resolveBackHref } from "@core/shared/back-nav";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";

function HeaderBackButtonInner({
  locale,
  href,
  className,
}: {
  locale: Locale;
  href?: string;
  className: string;
}) {
  const pathname = usePathname();
  const fallback = href ?? resolveBackHref(pathname);
  const backTarget = useNavBackTarget(fallback);
  if (!backTarget) return null;
  const t = createT(locale);
  return (
    <BackButton href={fallback ?? backTarget} label={t("common.back")} className={className} />
  );
}

export function HeaderBackButton({
  locale,
  href,
  className = "hidden",
}: {
  locale: Locale;
  href?: string;
  className?: string;
}) {
  return (
    <Suspense fallback={null}>
      <HeaderBackButtonInner locale={locale} href={href} className={className} />
    </Suspense>
  );
}
