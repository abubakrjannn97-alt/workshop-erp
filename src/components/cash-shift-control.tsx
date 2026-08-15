"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Wallet } from "lucide-react";
import { closeCashShift, openCashShift } from "@/app/actions/control";
import { PendingButton } from "@/components/pending-button";
import type { Locale } from "@/lib/i18n";
import { createT, intlLocale } from "@/lib/i18n";
import styles from "./cash-shift-control.module.css";

export type CashShiftControlData = {
  accounts: { id: string; code: string; name: string; balance: string }[];
  shifts: {
    id: string;
    accountId: string;
    openingAmount: string;
    openedAt: string;
    expectedBalance: string | null;
  }[];
};

export function CashShiftControl({
  data,
  locale,
  variant = "light",
}: {
  data: CashShiftControlData;
  locale: Locale;
  variant?: "light" | "dark";
}) {
  const t = createT(locale);
  const intl = intlLocale(locale);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeShift = data.shifts.find((shift) => data.accounts.some((account) => account.id === shift.accountId));
  const activeAccount = activeShift
    ? data.accounts.find((account) => account.id === activeShift.accountId)
    : null;
  const dark = variant === "dark";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.trigger} ${activeShift ? styles.triggerOpen : ""} ${dark ? styles.triggerDark : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={t("fin.shift")}
      >
        <span className={`${styles.dot} ${activeShift ? styles.dotOpen : ""}`} aria-hidden="true" />
        <Wallet size={13} strokeWidth={2} className="shrink-0 opacity-80" />
        <span className={styles.label}>
          {activeShift && activeAccount
            ? activeAccount.name
            : t("fin.openShift")}
        </span>
      </button>

      {open ? (
        <div className={styles.panel} role="dialog" aria-label={t("fin.shift")}>
          <p className={styles.title}>{t("fin.shift")}</p>

          {activeShift && activeAccount ? (
            <>
              <p className={styles.meta}>
                {activeAccount.name} · {t("fin.openedAt")}{" "}
                {new Date(activeShift.openedAt).toLocaleString(intl)} · {t("fin.start")}{" "}
                {activeShift.openingAmount} с
              </p>
              {activeShift.expectedBalance ? (
                <p className={styles.meta}>
                  {t("fin.expectedNow")}: {activeShift.expectedBalance} с
                </p>
              ) : null}
              <form
                action={closeCashShift}
                className={styles.form}
                onSubmit={() => setOpen(false)}
              >
                <input type="hidden" name="id" value={activeShift.id} />
                <input
                  name="closingActual"
                  placeholder={t("fin.closeBalance")}
                  className={styles.field}
                  inputMode="decimal"
                  required
                />
                <input
                  name="comment"
                  placeholder={t("fin.diffReason")}
                  className={styles.field}
                />
                <div className={styles.actions}>
                  <PendingButton className={styles.secondary}>{t("fin.closeShift")}</PendingButton>
                </div>
              </form>
            </>
          ) : (
            <form action={openCashShift} className={styles.form} onSubmit={() => setOpen(false)}>
              <select name="accountId" className={styles.field} defaultValue={data.accounts[0]?.id}>
                {data.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.balance} с
                  </option>
                ))}
              </select>
              <input
                name="openingAmount"
                placeholder={t("fin.openBalance")}
                className={styles.field}
                inputMode="decimal"
              />
              <div className={styles.actions}>
                <PendingButton className={styles.primary}>{t("fin.openShift")}</PendingButton>
              </div>
            </form>
          )}

          <Link href="/finance" className={styles.link} onClick={() => setOpen(false)}>
            {t("nav.finance")} →
          </Link>
        </div>
      ) : null}
    </div>
  );
}
