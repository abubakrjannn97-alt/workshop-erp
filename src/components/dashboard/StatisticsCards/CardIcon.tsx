import type { ReactNode } from "react";
import type { StatisticsCardAccent } from "./statisticsCards.types";
import styles from "./statistics-card.module.css";

const ACCENT_CLASS: Record<StatisticsCardAccent, string> = {
  gold: styles["stat-card__icon--gold"],
  green: styles["stat-card__icon--green"],
  blue: styles["stat-card__icon--blue"],
  red: styles["stat-card__icon--red"],
  purple: styles["stat-card__icon--purple"],
};

export function CardIcon({
  accent = "gold",
  children,
}: {
  accent?: StatisticsCardAccent;
  children: ReactNode;
}) {
  return (
    <span className={`${styles["stat-card__icon"]} ${ACCENT_CLASS[accent]}`}>
      {children}
    </span>
  );
}
