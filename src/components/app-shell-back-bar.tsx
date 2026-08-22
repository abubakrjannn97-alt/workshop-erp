"use client";

import { Suspense, useMemo } from "react";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { useNavBackTarget } from "@/components/use-nav-back-target";
import { shellPageContext } from "@/components/shell-page-context";
import { isShellRoot, resolveBackHref } from "@core/shared/back-nav";
import { bottomTabsForRole, tabHrefSet } from "@core/shared/nav";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import styles from "./app-shell-back-bar.module.css";

function AppShellBackBarInner({
  locale,
  roleCode,
  permissions,
}: {
  locale: Locale;
  roleCode: string;
  permissions: string[];
}) {
  const pathname = usePathname();
  const t = createT(locale);
  const tabRoots = useMemo(
    () => tabHrefSet(bottomTabsForRole(roleCode, permissions)),
    [roleCode, permissions],
  );
  const fallback = resolveBackHref(pathname, { tabRoots });
  const backTarget = useNavBackTarget(fallback, { tabRoots });

  if (isShellRoot(pathname, tabRoots) || !backTarget) return null;

  const ctx = shellPageContext(pathname);
  const title = ctx ? t(ctx.labelKey) : null;

  return (
    <header className={styles.bar}>
      <BackButton href={fallback ?? backTarget} label={t("common.back")} />
      {title ? <p className={styles.title}>{title}</p> : null}
    </header>
  );
}

export function AppShellBackBar(props: {
  locale: Locale;
  roleCode: string;
  permissions: string[];
}) {
  return (
    <Suspense fallback={null}>
      <AppShellBackBarInner {...props} />
    </Suspense>
  );
}
