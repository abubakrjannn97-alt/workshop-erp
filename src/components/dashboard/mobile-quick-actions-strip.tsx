"use client";

import Link from "next/link";
import { ICON_STROKE } from "@/components/nav-icons";
import { QUICK_ACTION_ICONS } from "./dash-quick-action-icons";
import type { DashActionTone, DashQuickAction } from "./dash-quick-actions-data";
import styles from "./dash-home.module.css";

const ACTION_TONE: Record<DashActionTone, string> = {
  orange: styles.actionOrange,
  green: styles.actionGreen,
  blue: styles.actionBlue,
  purple: styles.actionPurple,
  gold: styles.actionGold,
};

export function MobileQuickActionsStrip({ actions }: { actions: DashQuickAction[] }) {
  return (
    <div className={styles.actionsStripWrap}>
      <ul className={`${styles.actions} ${styles.actionsMobileStrip}`}>
        {actions.map((action) => {
          const Icon = QUICK_ACTION_ICONS[action.icon];
          const toneClass = action.tone ? ACTION_TONE[action.tone] : "";
          return (
            <li key={action.href}>
              <Link href={action.href} className={`${styles.actionStrip} ${toneClass}`.trim()}>
                <span className={styles.actionIcon}>
                  <Icon size={22} strokeWidth={ICON_STROKE} aria-hidden />
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
