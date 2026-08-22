"use client";

import { Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, Menu, X } from "lucide-react";
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
