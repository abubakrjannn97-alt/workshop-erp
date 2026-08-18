import type { ReactNode } from "react";
import type { StatisticsCardAccent } from "./statisticsCards.types";
import styles from "./statistics-card.module.css";

export function CardIcon({
  children,
}: {
  accent?: StatisticsCardAccent;
  children: ReactNode;
}) {
  return <span className={styles["stat-card__icon"]}>{children}</span>;
}
