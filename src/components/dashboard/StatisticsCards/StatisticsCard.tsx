import type { StatisticsCardProps, StatisticsCardTrend } from "./statisticsCards.types";
import styles from "./statistics-card.module.css";

function trendArrow(direction: StatisticsCardTrend["direction"]) {
  return direction === "down" ? "↓" : "↑";
}

export function StatisticsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  onMenuClick,
  menuAriaLabel,
  hideMenu,
  showTrend = false,
  className = "",
}: StatisticsCardProps) {
  const menuVisible = Boolean(onMenuClick) && hideMenu !== true;

  return (
    <article className={[styles["stat-card"], className].filter(Boolean).join(" ")}>
      <div className={styles["stat-card__body"]}>
        <header className={styles["stat-card__header"]}>
          {icon ? <span className={styles["stat-card__icon"]}>{icon}</span> : null}
          <h3 className={styles["stat-card__title"]}>{title}</h3>
          {menuVisible ? (
            <button
              type="button"
              className={styles["stat-card__menu"]}
              aria-label={menuAriaLabel ?? title}
              onClick={onMenuClick}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </button>
          ) : null}
        </header>

        <p className={styles["stat-card__value"]}>{value}</p>
        {subtitle ? <p className={styles["stat-card__subtitle"]}>{subtitle}</p> : null}

        {showTrend && trend ? (
          <div className={styles["stat-card__trend-row"]}>
            <span className={styles["stat-card__trend"]}>
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
