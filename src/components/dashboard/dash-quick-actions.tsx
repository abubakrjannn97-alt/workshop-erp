import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Users,
  Factory,
  Package,
  Truck,
  ChartColumn,
} from "lucide-react";
import { QuickAction } from "@/components/quick-action";
import styles from "./dash-quick-actions.module.css";

export type DashQuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function ownerQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/new", label: t("sales.newOrder"), icon: ClipboardList },
    { href: "/crm", label: t("nav.crm"), icon: Users },
    { href: "/production", label: t("nav.production"), icon: Factory },
    { href: "/warehouse", label: t("nav.warehouse"), icon: Package },
  ];
}

export function ownerSecondaryActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/purchasing", label: t("nav.purchasing"), icon: Truck },
    { href: "/analytics", label: t("nav.analytics"), icon: ChartColumn },
  ];
}

export function DashQuickActionsDesktop({
  primary,
  secondary = [],
}: {
  primary: DashQuickAction[];
  secondary?: DashQuickAction[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {primary.map((a) => (
        <QuickAction key={a.href} href={a.href} label={a.label} icon={a.icon} />
      ))}
      {secondary.map((a) => (
        <QuickAction key={a.href} href={a.href} label={a.label} icon={a.icon} />
      ))}
    </div>
  );
}

export function DashQuickActionsMobile({ actions }: { actions: DashQuickAction[] }) {
  return (
    <div className={styles.strip}>
      <div className={`${styles.row} no-scrollbar snap-x`}>
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <a key={a.href} href={a.href} className={`${styles.chip} snap-start`}>
              <span className={styles.chipIcon}>
                <Icon size={18} strokeWidth={2} aria-hidden />
              </span>
              <span className={styles.chipLabel}>{a.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
