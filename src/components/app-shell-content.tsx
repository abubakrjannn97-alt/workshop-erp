"use client";

import { Suspense, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShellBackBar } from "@/components/app-shell-back-bar";
import { AppShellMain } from "@/components/app-shell-main";
import { useNavBackTarget } from "@/components/use-nav-back-target";
import { isShellRoot, resolveBackHref } from "@core/shared/back-nav";
import { bottomTabsForRole, tabHrefSet } from "@core/shared/nav";
import type { Locale } from "@core/shared/i18n/i18n";

function AppShellContentInner({
  locale,
  roleCode,
  permissions,
  children,
}: {
  locale: Locale;
  roleCode: string;
  permissions: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const tabRoots = useMemo(
    () => tabHrefSet(bottomTabsForRole(roleCode, permissions)),
    [roleCode, permissions],
  );
  const fallback = resolveBackHref(pathname, { tabRoots });
  const backTarget = useNavBackTarget(fallback, { tabRoots });
  const showBack = !isShellRoot(pathname, tabRoots) && Boolean(backTarget);

  return (
    <>
      {showBack ? <AppShellBackBar locale={locale} roleCode={roleCode} permissions={permissions} /> : null}
      <AppShellMain nestedChrome={showBack}>{children}</AppShellMain>
    </>
  );
}

export function AppShellContent({
  locale,
  roleCode,
  permissions,
  children,
}: {
  locale: Locale;
  roleCode: string;
  permissions: string[];
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<AppShellMain nestedChrome={false}>{children}</AppShellMain>}>
      <AppShellContentInner locale={locale} roleCode={roleCode} permissions={permissions}>
        {children}
      </AppShellContentInner>
    </Suspense>
  );
}
