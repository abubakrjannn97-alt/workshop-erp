import styles from "./order-detail.module.css";

const PIPELINE = [
  { id: "pay", codes: ["NEW", "AWAITING_PAYMENT", "ON_HOLD"], labelKey: "orders.stageStep1" },
  { id: "confirm", codes: ["CONFIRMED", "SCHEDULED"], labelKey: "orders.stageStep2" },
  { id: "production", codes: ["IN_PRODUCTION", "PARTIAL"], labelKey: "orders.stageStep3" },
  { id: "warehouse", codes: ["READY", "IN_FG"], labelKey: "orders.stageStep4" },
  { id: "done", codes: ["ISSUED", "COMPLETED"], labelKey: "orders.stageStep5" },
] as const;

const STATE_CLASS = {
  done: styles.stageItemDone,
  current: styles.stageItemCurrent,
  pending: styles.stageItemPending,
} as const;

export function OrderStageProgress({
  currentCode,
  t,
}: {
  currentCode: string;
  t: (key: string) => string;
}) {
  if (["CANCELLED", "RETURN"].includes(currentCode)) return null;

  const currentIdx = PIPELINE.findIndex((step) =>
    (step.codes as readonly string[]).includes(currentCode),
  );
  const activeIdx = currentIdx >= 0 ? currentIdx : 0;

  return (
    <ol className={styles.stageTrack} aria-label={t("orders.changeStatus")}>
      {PIPELINE.map((step, index) => {
        const state = index < activeIdx ? "done" : index === activeIdx ? "current" : "pending";
        return (
          <li key={step.id} className={STATE_CLASS[state]}>
            <span className={styles.stageDot}>{index + 1}</span>
            <span className={styles.stageLabel}>{t(step.labelKey)}</span>
          </li>
        );
      })}
    </ol>
  );
}
