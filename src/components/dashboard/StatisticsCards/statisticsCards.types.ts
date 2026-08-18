import type { ReactNode } from "react";

export type StatisticsCardAccent = "gold" | "green" | "blue" | "red" | "purple";

export type TrendDirection = "up" | "down" | "neutral";

export type StatisticsCardTrend = {
  value: string;
  direction: TrendDirection;
  label: string;
};

export type StatisticsCardData = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  trend: StatisticsCardTrend;
  icon: ReactNode;
  accent?: StatisticsCardAccent;
};

export type StatisticsCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  accent?: StatisticsCardAccent;
  trend?: StatisticsCardTrend;
  onMenuClick?: () => void;
  menuAriaLabel?: string;
  hideMenu?: boolean;
  showTrend?: boolean;
  className?: string;
};
