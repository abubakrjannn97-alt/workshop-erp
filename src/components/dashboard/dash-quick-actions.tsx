"use client";

import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Users,
  Factory,
  Package,
  Truck,
  ChartColumn,
  Play,
  Plus,
  Box,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./dash-home.module.css";

export type DashActionTone = "orange" | "green" | "blue" | "purple" | "gold";

export type DashQuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone?: DashActionTone;
};

const ACTION_TONE: Record<DashActionTone, string> = {
  orange: styles.actionOrange,
  green: styles.actionGreen,
  blue: styles.actionBlue,
  purple: styles.actionPurple,
  gold: styles.actionGold,
};

export function ownerQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/new", label: t("sales.newOrder"), icon: ClipboardList, tone: "orange" },
    { href: "/crm", label: t("nav.crm"), icon: Users, tone: "blue" },
    { href: "/production", label: t("nav.production"), icon: Factory, tone: "green" },
    { href: "/warehouse", label: t("nav.warehouse"), icon: Package, tone: "purple" },
  ];
}

export function ownerDesktopQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/new", label: t("sales.newOrder"), icon: Plus, tone: "orange" },
    { href: "/production", label: t("home.actionStartProduction"), icon: Play, tone: "green" },
    { href: "/products/new", label: t("home.actionAddProduct"), icon: Box, tone: "blue" },
    { href: "/warehouse", label: t("home.actionToWarehouse"), icon: Truck, tone: "purple" },
    { href: "/analytics", label: t("home.actionDailyReport"), icon: ChartColumn, tone: "gold" },
  ];
}

export function ownerSecondaryActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/purchasing", label: t("nav.purchasing"), icon: Truck, tone: "purple" },
    { href: "/analytics", label: t("nav.analytics"), icon: ChartColumn, tone: "gold" },
  ];
}

export function ownerMobileQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/new", label: t("sales.newOrder"), icon: Plus, tone: "orange" },
    { href: "/production", label: t("home.actionStartProduction"), icon: Play, tone: "green" },
    { href: "/warehouse", label: t("home.actionToWarehouse"), icon: Truck, tone: "purple" },
    { href: "/analytics", label: t("home.actionDailyReport"), icon: ChartColumn, tone: "gold" },
  ];
}

function MobileQuickActionsStrip({ actions }: { actions: DashQuickAction[] }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const syncPages = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const perPage = el.clientWidth;
    if (perPage <= 0) return;
    const count = Math.max(1, Math.ceil(el.scrollWidth / perPage));
    setPageCount(count);
    setPage(Math.min(count - 1, Math.round(el.scrollLeft / perPage)));
  }, []);

  useEffect(() => {
    syncPages();
    window.addEventListener("resize", syncPages);
    return () => window.removeEventListener("resize", syncPages);
  }, [syncPages, actions.length]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el || el.clientWidth <= 0) return;
    setPage(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className={styles.actionsStripWrap}>
      <ul ref={listRef} className={`${styles.actions} ${styles.actionsMobileStrip}`} onScroll={onScroll}>
        {actions.map((action) => {
          const Icon = action.icon;
          const toneClass = action.tone ? ACTION_TONE[action.tone] : "";
          return (
            <li key={action.href}>
              <Link href={action.href} className={`${styles.action} ${styles.actionStrip} ${toneClass}`.trim()}>
                <span className={styles.actionIcon}>
                  <Icon size={22} strokeWidth={ICON_STROKE} aria-hidden />
                </span>
                <span className={styles.actionLabel}>{action.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {pageCount > 1 ? (
        <div className={styles.actionsDots} aria-hidden>
          {Array.from({ length: pageCount }, (_, i) => (
            <span key={i} className={i === page ? styles.actionsDotActive : styles.actionsDot} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DashQuickActions({
  actions,
  layout = "mobile",
}: {
  actions: DashQuickAction[];
  layout?: "mobile" | "desktop" | "mobileStrip";
}) {
  if (layout === "mobileStrip") {
    return <MobileQuickActionsStrip actions={actions} />;
  }

  const gridClass =
    layout === "desktop"
      ? `${styles.actions} ${styles.actionsDesktop}`
      : `${styles.actions} ${styles.actionsMobileGrid}`;

  return (
    <div className={styles.actionsWrap}>
      <ul className={gridClass}>
        {actions.map((action) => {
          const Icon = action.icon;
          const toneClass = action.tone ? ACTION_TONE[action.tone] : "";
          return (
            <li key={action.href}>
              <Link href={action.href} className={`${styles.action} ${toneClass}`.trim()}>
                <span className={styles.actionIcon}>
                  <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden />
                </span>
                <span className={styles.actionLabel}>{action.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DashQuickActionsDesktop({
  primary,
}: {
  primary: DashQuickAction[];
  secondary?: DashQuickAction[];
}) {
  return <DashQuickActions actions={primary} layout="desktop" />;
}

export function DashQuickActionsMobile({ actions }: { actions: DashQuickAction[] }) {
  return <DashQuickActions actions={actions} layout="mobile" />;
}
