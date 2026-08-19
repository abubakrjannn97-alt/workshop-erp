import styles from "./dash-home.module.css";

function greetingKey(hour: number): "home.greetMorningShort" | "home.greetAfternoonShort" | "home.greetEveningShort" {
  if (hour < 12) return "home.greetMorningShort";
  if (hour < 18) return "home.greetAfternoonShort";
  return "home.greetEveningShort";
}

export function DashGreeting({ t }: { t: (key: string) => string }) {
  const hour = new Date().getHours();

  return (
    <header className={styles.greeting}>
      <h1 className={styles.greetingTitle}>{t(greetingKey(hour))}</h1>
      <p className={styles.greetingSub}>{t("home.greetCalm")}</p>
    </header>
  );
}
