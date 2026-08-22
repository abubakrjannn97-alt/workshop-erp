import styles from "./dash-home.module.css";

export function greetingKey(
  hour: number,
): "home.greetMorningShort" | "home.greetAfternoonShort" | "home.greetEveningShort" {
  if (hour < 12) return "home.greetMorningShort";
  if (hour < 18) return "home.greetAfternoonShort";
  return "home.greetEveningShort";
}

export function greetingTitle(t: (key: string) => string, hour = new Date().getHours()) {
  return t(greetingKey(hour));
}

export function DashGreeting({ t, mobile }: { t: (key: string) => string; mobile?: boolean }) {
  const hour = new Date().getHours();

  if (mobile) {
    return (
      <div className={styles.hero}>
        <div className={styles.heroBg} aria-hidden />
        <header className={styles.greeting}>
          <h1 className={styles.greetingTitle}>{greetingTitle(t, hour)}</h1>
          <p className={styles.greetingSub}>{t("home.greetCalm")}</p>
        </header>
      </div>
    );
  }

  return (
    <header className={styles.greeting}>
      <h1 className={styles.greetingTitle}>{greetingTitle(t, hour)}</h1>
      <p className={styles.greetingSub}>{t("home.greetCalm")}</p>
    </header>
  );
}
