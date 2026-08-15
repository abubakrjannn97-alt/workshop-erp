import { CardIcon } from "./CardIcon";
import type { StatisticsCardAccent, StatisticsCardProps, StatisticsCardTrend } from "./statisticsCards.types";
import styles from "./statistics-card.module.css";

function MenuDots() {
  return (
    <span className={styles["stat-card__menu"]} aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

function GoldWave() {
  return (
    <svg className={styles["stat-card__line"]} viewBox="0 0 220 90" fill="none" aria-hidden="true">
      <path
        d="M8 72 C38 68, 52 52, 78 56 C104 60, 118 38, 148 42 C172 45, 188 28, 216 22"
        stroke="#D4AF37"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M18 78 C46 70, 64 58, 90 62 C118 66, 136 46, 168 48 C190 50, 202 36, 220 30"
        stroke="#D4AF37"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M28 84 C58 76, 76 66, 104 70 C132 74, 150 56, 186 58"
        stroke="#D4AF37"
        strokeWidth="0.75"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

function trendArrow(direction: StatisticsCardTrend["direction"]) {
  return direction === "down" ? "↓" : "↑";
}

function trendTone(accent: StatisticsCardAccent, direction: StatisticsCardTrend["direction"]) {
  if (accent === "red") {
    return direction === "up" ? "red" : "gold";
  }
  return direction === "down" ? "red" : "gold";
}

export function StatisticsCard({
  title,
  value,
  subtitle,
  icon,
  accent = "gold",
  trend,
  hideMenu = false,
  className = "",
}: StatisticsCardProps) {
  const tone = trend ? trendTone(accent, trend.direction) : "gold";

  return (
    <article className={[styles["stat-card"], className].filter(Boolean).join(" ")}>
      <GoldWave />
      <div className={styles["stat-card__body"]}>
        <header className={styles["stat-card__header"]}>
          <CardIcon accent={accent}>{icon}</CardIcon>
          <h3 className={styles["stat-card__title"]}>{title}</h3>
          {hideMenu ? <span className={styles["stat-card__menu-spacer"]} /> : <MenuDots />}
        </header>

        <p className={styles["stat-card__value"]}>{value}</p>
        {subtitle ? <p className={styles["stat-card__subtitle"]}>{subtitle}</p> : null}

        {trend ? (
          <div className={styles["stat-card__trend-row"]}>
            <span className={`${styles["stat-card__trend"]} ${styles[`stat-card__trend--${tone}`]}`}>
              <span aria-hidden="true">{trendArrow(trend.direction)}</span>
              <span>{trend.value}</span>
              {trend.label ? <span className={styles["stat-card__trend-text"]}>{trend.label}</span> : null}
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
