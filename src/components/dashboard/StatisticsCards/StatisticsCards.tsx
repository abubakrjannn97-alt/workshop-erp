import { StatisticsCard } from "./StatisticsCard";
import { DEMO_STATISTICS_CARDS } from "./statisticsCards.data";
import type { StatisticsCardData } from "./statisticsCards.types";
import styles from "./statistics-card.module.css";

export function StatisticsCards({
  cards = DEMO_STATISTICS_CARDS,
}: {
  cards?: StatisticsCardData[];
}) {
  return (
    <section className={styles["stat-cards"]} data-tour="home-kpis" aria-label="Statistics">
      {cards.map((card) => (
        <StatisticsCard
          key={card.id}
          title={card.title}
          value={card.value}
          subtitle={card.subtitle}
          icon={card.icon}
          accent={card.accent}
          trend={card.trend}
        />
      ))}
    </section>
  );
}
