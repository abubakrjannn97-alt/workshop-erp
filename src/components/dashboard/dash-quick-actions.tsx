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

export function DashQuickActions({
  actions,
  layout = "mobile",
}: {
  actions: DashQuickAction[];
  layout?: "mobile" | "desktop";
}) {
  const gridClass = layout === "desktop" ? `${styles.actions} ${styles.actionsDesktop}` : styles.actions;

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
      {layout === "mobile" ? (
        <div className={styles.actionDots} aria-hidden>
          <span className={styles.actionDotActive} />
          <span className={styles.actionDot} />
          <span className={styles.actionDot} />
        </div>
      ) : null}
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
