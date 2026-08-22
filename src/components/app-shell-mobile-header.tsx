"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Menu, X } from "lucide-react";
import { WorkshopMark } from "@/components/workshop-mark";
import { MobileHeaderMenu } from "@/components/mobile-header-menu";
import { useNavBackTarget } from "@/components/use-nav-back-target";
import { ICON_STROKE } from "@/components/nav-icons";
import { resolveBackHref } from "@core/shared/back-nav";
import { bottomTabsForRole, tabHrefSet } from "@core/shared/nav";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import styles from "./app-shell-mobile-header.module.css";

function MobileHeaderNavSlotInner({
  tabRoots,
  workerShell,
  backLabel,
  menuLabel,
  menuOpen,
  onMenuToggle,
}: {
  tabRoots: ReadonlySet<string>;
  workerShell: boolean;
  backLabel: string;
  menuLabel: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const fallback = resolveBackHref(pathname, { tabRoots });
  const backTarget = useNavBackTarget(fallback, { tabRoots });

  if (backTarget) {
    return (
      <button
        type="button"
        className={styles.menuBtn}
        aria-label={backLabel}
        onClick={() => router.push(backTarget)}
      >
        <ChevronLeft size={20} strokeWidth={ICON_STROKE} aria-hidden />
      </button>
    );
  }

  if (!workerShell) {
    return (
      <button
        type="button"
        className={styles.menuBtn}
        aria-label={menuLabel}
        aria-expanded={menuOpen}
        aria-controls="mobile-header-menu"
        onClick={onMenuToggle}
      >
        {menuOpen ? (
          <X size={20} strokeWidth={ICON_STROKE} aria-hidden />
        ) : (
          <Menu size={20} strokeWidth={ICON_STROKE} aria-hidden />
        )}
      </button>
    );
  }

  return <span className={styles.menuSpacer} aria-hidden />;
}

function MobileHeaderNavSlot(props: {
  tabRoots: ReadonlySet<string>;
  workerShell: boolean;
  backLabel: string;
  menuLabel: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
}) {
  return (
    <Suspense fallback={<span className={styles.menuSpacer} aria-hidden />}>
      <MobileHeaderNavSlotInner {...props} />
    </Suspense>
  );
}

export function AppShellMobileHeader({
  locale,
  userName,
  roleName,
  roleCode,
  permissions,
  workerShell = false,
}: {
  locale: Locale;
  userName: string;
  roleName: string;
  roleCode: string;
  permissions: string[];
  workerShell?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = pathname === "/";
  const tabRoots = useMemo(
    () => tabHrefSet(bottomTabsForRole(roleCode, permissions)),
    [roleCode, permissions],
  );
  const t = createT(locale);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isWorker = workerShell;

  if (isHome) return null;

  return (
    <>
      <header className={styles.bar}>
        <MobileHeaderNavSlot
          tabRoots={tabRoots}
          workerShell={isWorker}
          backLabel={t("common.back")}
          menuLabel={t("nav.more")}
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((open) => !open)}
        />
        <div className={styles.brand} aria-hidden>
          <WorkshopMark size={24} className={styles.brandLogo} />
          <div className={styles.brandText}>
            <span className={styles.brandLine}>Stone</span>
            <span className={styles.brandLine}>Factory</span>
          </div>
        </div>
        <div className={styles.actions}>
          <span className={styles.menuSpacer} aria-hidden />
        </div>
      </header>
      {!isWorker ? (
        <MobileHeaderMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          locale={locale}
          userName={userName}
          roleName={roleName}
          roleCode={roleCode}
          permissions={permissions}
        />
      ) : null}
    </>
  );
}
