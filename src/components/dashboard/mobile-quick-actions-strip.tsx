"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
          const Icon = QUICK_ACTION_ICONS[action.icon];
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
