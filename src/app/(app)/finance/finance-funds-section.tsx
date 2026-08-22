"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { createFinancialFund, deleteFinancialFund, updateFinancialFund } from "@/app/actions/finance";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./finance.module.css";

/** Core funds created by bootstrap — not deletable from the UI. */
const PROTECTED_FUND_CODES = new Set(["MATERIALS", "LABOR", "COMMISSION", "OPEX", "PROFIT"]);

export type FinanceFundRow = {
  id: string;
  code: string;
  name: string;
  balance: string;
  balanceNegative: boolean;
  isSystem: boolean;
};

function canDeleteFund(fund: FinanceFundRow) {
  return !PROTECTED_FUND_CODES.has(fund.code);
}

export function FinanceFundsSection({
  locale,
  funds,
  canManage,
}: {
  locale: Locale;
  funds: FinanceFundRow[];
  canManage: boolean;
}) {
  const t = createT(locale);
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const editing = funds.find((f) => f.id === editId);

  function submitCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createFinancialFund(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setAddOpen(false);
      router.refresh();
    });
  }

  function submitDelete() {
    if (!editing) return;
    if (!window.confirm(t("fin.deleteFundConfirm", { name: editing.name }))) return;
    setError(null);
    const body = new FormData();
    body.set("id", editing.id);
    startTransition(async () => {
      const result = await deleteFinancialFund(body);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditId(null);
      router.refresh();
    });
  }

  function submitUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateFinancialFund(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditId(null);
      router.refresh();
    });
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitleAccent}>{t("fin.funds")}</h2>
        {canManage ? (
          <button
            type="button"
            className={styles.sectionHeadLink}
            onClick={() => {
              setAddOpen((v) => !v);
              setEditId(null);
              setError(null);
            }}
            aria-expanded={addOpen}
          >
            {addOpen ? t("common.cancel") : `+ ${t("fin.addFundShort")}`}
          </button>
        ) : null}
      </div>

      {addOpen && canManage ? (
        <form action={submitCreate} className={styles.fundAddForm}>
          <div className={styles.fundAddRow}>
            <label className={styles.fundAddField}>
              <span className={styles.fundAddLabel}>{t("fin.addFundName")}</span>
              <input name="name" required className="ui-input" placeholder={t("fin.addFundNamePh")} autoFocus />
            </label>
            <label className={styles.fundAddField}>
              <span className={styles.fundAddLabel}>{t("common.amount")}</span>
              <input name="amount" required className="ui-input" inputMode="decimal" placeholder="0" />
            </label>
          </div>
          {error && !editId ? <p className={styles.fundAddError}>{error}</p> : null}
          <button type="submit" className={styles.fundAddSubmit} disabled={pending}>
            {pending ? t("common.sending") : t("fin.addFundSubmit")}
          </button>
        </form>
      ) : null}

      {editId && editing && canManage ? (
        <form action={submitUpdate} className={styles.fundAddForm}>
          <input type="hidden" name="id" value={editing.id} />
          <div className={styles.fundAddRow}>
            <label className={styles.fundAddField}>
              <span className={styles.fundAddLabel}>{t("fin.addFundName")}</span>
              <input name="name" required className="ui-input" defaultValue={editing.name} />
            </label>
            <label className={styles.fundAddField}>
              <span className={styles.fundAddLabel}>{t("fin.fundAdjustment")}</span>
              <input
                name="adjustment"
                className="ui-input"
                inputMode="decimal"
                placeholder="0"
                defaultValue=""
              />
            </label>
          </div>
          <p className={styles.fundEditHint}>
            {t("fin.fundCurrent")}: {moneyDisplay(editing.balance)} с · {t("fin.fundAdjustmentHint")}
          </p>
          {error ? <p className={styles.fundAddError}>{error}</p> : null}
          <div className={styles.fundEditActions}>
            <button type="submit" className={styles.fundAddSubmit} disabled={pending}>
              {pending ? t("common.sending") : t("common.save")}
            </button>
            <button type="button" className={styles.fundEditCancel} onClick={() => setEditId(null)}>
              {t("common.cancel")}
            </button>
          </div>
          {canDeleteFund(editing) ? (
            <button type="button" className={styles.fundDeleteBtn} disabled={pending} onClick={submitDelete}>
              {t("fin.deleteFund")}
            </button>
          ) : (
            <p className={styles.fundEditHint}>{t("fin.deleteFundSystemHint")}</p>
          )}
        </form>
      ) : null}

      <div className={styles.sectionBody}>
        <ul className={styles.balanceList}>
          {funds.map((f) => (
            <li key={f.id} className={styles.balanceRow}>
              <span className={styles.balanceName}>{f.name}</span>
              <div className={styles.fundRowRight}>
                <span
                  className={
                    f.code === "PROFIT"
                      ? styles.balanceValueAccent
                      : f.balanceNegative
                        ? styles.balanceValueBad
                        : styles.balanceValue
                  }
                >
                  {moneyDisplay(f.balance)} с
                </span>
                {canManage ? (
                  <button
                    type="button"
                    className={styles.fundEditBtn}
                    aria-label={t("common.edit")}
                    onClick={() => {
                      setEditId(f.id);
                      setAddOpen(false);
                      setError(null);
                    }}
                  >
                    <Pencil size={14} strokeWidth={ICON_STROKE} aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
