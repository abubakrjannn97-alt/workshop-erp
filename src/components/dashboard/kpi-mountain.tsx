import styles from "./dash-home.module.css";

export function KpiMountain() {
  return (
    <svg
      className={styles.kpiMountain}
      viewBox="0 0 200 48"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M0 48V30c16-6 28 0 42-10s34-8 50 2 34 4 52-6 36-4 56 8V48H0Z"
        fill="currentColor"
        opacity="0.28"
      />
      <path
        d="M0 48V36c20-4 36 4 54-6s38-2 54 8 32-2 46-10 26-2 26-2v14H0Z"
        fill="currentColor"
        opacity="0.14"
      />
    </svg>
  );
}
