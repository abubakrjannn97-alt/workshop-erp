"use client";

import { useState } from "react";
import { createT, intlLocale, type Locale } from "@core/shared/i18n/i18n";
import { moneyDisplay } from "@core/shared/decimal";
import styles from "@/app/(app)/employees/employees.module.css";

export type PayoutRow = {
  id: string;
  amount: string;
  comment: string | null;
  createdAt: string;
  accountLabel: string;
};

type Props = {
  locale: Locale;
  payouts: PayoutRow[];
};

const VISIBLE = 3;

function payoutMethodLabel(comment: string | null, accountLabel: string, t: ReturnType<typeof createT>) {
  if (comment?.startsWith("card:")) {
    const cardId = comment.slice(5).split("|")[0];
    const names: Record<string, string> = {
      alif: "Alif",
      dc: "DC",
      eskhata: "Эсхата",
    };
    return `${t("emp.payCard")} · ${names[cardId] ?? cardId}`;
  }
  if (comment === "cash" || accountLabel.toLowerCase().includes("касс")) {
    return t("emp.payCash");
  }
  return accountLabel;
}

export function EmployeePayoutHistory({ locale, payouts }: Props) {
  const t = createT(locale);
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? payouts : payouts.slice(0, VISIBLE);
  const hasMore = payouts.length > VISIBLE;

  if (payouts.length === 0) {
    return (
      <div className={styles.sectionBody}>
        <p style={{ fontSize: 14, color: "var(--ink-3)" }}>{t("emp.noPayoutsYet")}</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t("list.col.when")}</th>
              <th>{t("emp.payMethod")}</th>
              <th className={styles.thRight}>{t("list.col.sum")}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className={styles.tdBold}>
                    {new Date(p.createdAt).toLocaleDateString(intlLocale(locale), {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <p className={styles.tdMuted}>
                    {new Date(p.createdAt).toLocaleTimeString(intlLocale(locale), {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </td>
                <td className={styles.tdMuted}>{payoutMethodLabel(p.comment, p.accountLabel, t)}</td>
                <td className={styles.tdRight}>{moneyDisplay(p.amount)} с</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className={styles.mobileList}>
        {visible.map((p) => (
          <li key={p.id} className={styles.mobileCard} style={{ textDecoration: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={styles.mobileName}>
                {new Date(p.createdAt).toLocaleDateString(intlLocale(locale))}
              </span>
              <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{moneyDisplay(p.amount)} с</span>
            </div>
            <p className={styles.mobileMeta}>{payoutMethodLabel(p.comment, p.accountLabel, t)}</p>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <div className={styles.sectionBody} style={{ paddingTop: 0 }}>
          <button
            type="button"
            className={styles.ghostLink}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? t("emp.showLessPayouts") : t("emp.showAllPayouts")}
          </button>
        </div>
      ) : null}
    </>
  );
}
