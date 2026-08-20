"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./orders.module.css";

export function OrdersMobileHeaderTools({
  canCreate,
  newOrderHref,
  newOrderLabel,
}: {
  canCreate: boolean;
  newOrderHref: string;
  newOrderLabel: string;
}) {
  if (!canCreate) return null;

  return (
    <div className={styles.mobileHeaderToolsGrid}>
      <div className={styles.mobileHeaderIcons}>
        <Link href={newOrderHref} className={styles.iconBtn} aria-label={newOrderLabel} data-tour="orders-new-mobile">
          <Plus size={20} strokeWidth={ICON_STROKE} />
        </Link>
      </div>
    </div>
  );
}
