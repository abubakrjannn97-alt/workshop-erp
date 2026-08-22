import styles from "./worker-pages.module.css";

export function WorkerPageHeader({
  title,
  trailing,
}: {
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>{title}</h1>
      {trailing ? <div className={styles.pageHeaderTrailing}>{trailing}</div> : null}
    </header>
  );
}
