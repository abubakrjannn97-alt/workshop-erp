import Link from "next/link";
import { ICON_STROKE } from "@/components/nav-icons";
import { QUICK_ACTION_ICONS } from "./dash-quick-action-icons";
import type { DashActionTone, DashQuickAction } from "./dash-quick-actions-data";
import { MobileQuickActionsStrip } from "./mobile-quick-actions-strip";
import styles from "./dash-home.module.css";

export type { DashActionTone, DashQuickAction } from "./dash-quick-actions-data";
export {
  ownerQuickActions,
  ownerDesktopQuickActions,
  ownerMobileQuickActions,
  ownerSecondaryActions,
} from "./dash-quick-actions-data";

const ACTION_TONE: Record<DashActionTone, string> = {
  orange: styles.actionOrange,
  green: styles.actionGreen,
  blue: styles.actionBlue,
  purple: styles.actionPurple,
  gold: styles.actionGold,
};

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
          const Icon = QUICK_ACTION_ICONS[action.icon];
          const toneClass = action.tone ? ACTION_TONE[action.tone] : "";
          return (
            <li key={action.href}>
              <Link href={action.href} className={`${styles.action} ${toneClass}`.trim()}>
                <span className={styles.actionIcon}>
                  <Icon size={layout === "desktop" ? 16 : 20} strokeWidth={ICON_STROKE} aria-hidden />
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
