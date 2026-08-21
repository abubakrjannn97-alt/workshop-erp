"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./orders.module.css";

/** Floating quick-sale button for mobile/desktop sales page (not in top header). */
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
    <Link href={newOrderHref} className={styles.fabSale} aria-label={newOrderLabel} data-tour="orders-quick-sale">
      <Plus size={22} strokeWidth={ICON_STROKE} aria-hidden />
    </Link>
  );
}
