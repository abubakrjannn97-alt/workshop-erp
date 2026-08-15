import { ShoppingBag, Banknote, CircleAlert, Wallet } from "lucide-react";
import type { StatisticsCardData } from "./statisticsCards.types";

const iconProps = { size: 17, strokeWidth: 1.6, "aria-hidden": true } as const;

export const DEMO_STATISTICS_CARDS: StatisticsCardData[] = [
  {
    id: "sales",
    title: "Фурӯш",
    value: "55 500.00 с",
    subtitle: "Дар ин моҳ",
    trend: {
      value: "12.5%",
      direction: "up",
      label: "нисбат ба гузашта",
    },
    icon: <ShoppingBag {...iconProps} />,
    accent: "gold",
  },
  {
    id: "received",
    title: "Гирифта шуд",
    value: "37 500.00 с",
    subtitle: "Дар ин моҳ",
    trend: {
      value: "8.2%",
      direction: "up",
      label: "нисбат ба гузашта",
    },
    icon: <Banknote {...iconProps} />,
    accent: "green",
  },
  {
    id: "client-debt",
    title: "Қарзи мизоҷ",
    value: "18 000.00 с",
    subtitle: "Қарзи мо 108 000.00 с",
    trend: {
      value: "3.7%",
      direction: "down",
      label: "нисбат ба гузашта",
    },
    icon: <CircleAlert {...iconProps} />,
    accent: "red",
  },
  {
    id: "withdrawable",
    title: "Барои гирифтан",
    value: "10 455.00 с",
    subtitle: "Фонди фонда",
    trend: {
      value: "5.1%",
      direction: "up",
      label: "нисбат ба гузашта",
    },
    icon: <Wallet {...iconProps} />,
    accent: "purple",
  },
];
