"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { useNavBackTarget } from "@/components/use-nav-back-target";
import { ICON_STROKE } from "@/components/nav-icons";
import { resolveBackHref } from "@core/shared/back-nav";
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
  const fallback = resolveBackHref(pathname, { tabRoots });
  const backTarget = useNavBackTarget(fallback, { tabRoots });

  if (backTarget) {
    return (
      <BackButton
        href={fallback ?? backTarget}
        label={backLabel}
        className={styles.menuBtn}
      />
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

export function MobileHeaderNavSlot(props: {
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
