import styles from "@/components/dashboard/dash-home.module.css";

export function FundRow({
  label,
  amount,
  highlight,
}: {
  code?: string;
  label: string;
  amount: string;
  highlight?: boolean;
}) {
  return (
    <li>
      <div className={`${styles.row} ${highlight ? styles.fundStrong : ""}`}>
        <span className={`${styles.rowTitle} ${styles.rowMain}`}>{label}</span>
        <span className={styles.rowMeta}>{amount}</span>
      </div>
    </li>
  );
}
