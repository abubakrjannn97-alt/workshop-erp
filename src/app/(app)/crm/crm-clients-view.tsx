"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Users, X } from "lucide-react";
import { createCustomer } from "@/app/actions/customers";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { EmptyState } from "@/components/empty-state";
import { RevealList } from "@/components/reveal-list";
import { ICON_STROKE } from "@/components/nav-icons";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import { D, moneyDisplay } from "@core/shared/decimal";
import styles from "./customers.module.css";

export type CrmCustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  managerName: string | null;
  turnover: string;
  debt: string;
};

export function CrmClientsView({
  locale,
  canManage,
  customers,
}: {
  locale: Locale;
  canManage: boolean;
  customers: CrmCustomerRow[];
}) {
  const t = createT(locale);
  const [showForm, setShowForm] = useState(false);
  const [showList, setShowList] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createCustomer(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setShowForm(false);
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.crm")}</h1>
          <p className={styles.subtitle}>{t("crm.manageHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/crm/history" className={styles.ghostLink}>
            {t("crm.purchaseHistory")}
          </Link>
          <Link href="/orders" className={styles.ghostLink}>
            {t("page.orders")}
          </Link>
          {canManage ? (
            <button
              type="button"
              className={styles.primaryBtn}
              data-tour="crm-new"
              aria-expanded={showForm}
              onClick={() => setShowForm((v) => !v)}
            >
              <span className={styles.primaryBtnIcon} aria-hidden>
                {showForm ? <X size={16} strokeWidth={ICON_STROKE} /> : <Plus size={16} strokeWidth={ICON_STROKE} />}
              </span>
              {showForm ? t("common.close") : t("crm.newCustomer")}
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className={styles.iconBtn}
              aria-label={showForm ? t("common.close") : t("crm.newCustomer")}
              aria-expanded={showForm}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? <X size={20} strokeWidth={ICON_STROKE} /> : <Plus size={20} strokeWidth={ICON_STROKE} />}
            </button>
          ) : null}
        </div>
      </header>

      {canManage && showForm ? (
        <section className={styles.section} data-tour="crm-new">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("crm.newCustomer")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={onCreate} className={styles.formGrid}>
              <FormField label={t("crm.fioCompany")} required>
                <input name="name" required placeholder={t("crm.fioCompany")} className="ui-input" />
              </FormField>
              <FormField label={t("common.phone")}>
                <input name="phone" placeholder={t("common.phone")} className="ui-input" inputMode="tel" />
              </FormField>
              <FormField label={t("common.whatsapp")}>
                <input name="whatsapp" placeholder={t("common.whatsapp")} className="ui-input" inputMode="tel" />
              </FormField>
              <FormField label={t("crm.sourceOptional")}>
                <input name="source" placeholder={t("crm.sourceOptional")} className="ui-input" />
              </FormField>
              {error ? <p className={styles.formError}>{error}</p> : null}
              <div className={styles.formActions}>
                <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
                  {t("common.save")}
                </PendingButton>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                  {t("common.close")}
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section} data-tour="crm-customers">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>
            {t("crm.customers")}
            {customers.length > 0 ? (
              <span className={styles.countBadge}>{customers.length}</span>
            ) : null}
          </h2>
          {customers.length > 0 ? (
            <button
              type="button"
              className={styles.toggleListBtn}
              onClick={() => setShowList((v) => !v)}
              aria-expanded={showList}
            >
              {showList ? t("crm.hideCustomers") : t("crm.showCustomers")}
            </button>
          ) : null}
        </div>

        {!showList ? (
          <div className={styles.sectionBody}>
            <p className={styles.listCollapsed}>{t("crm.customersHidden", { n: String(customers.length) })}</p>
          </div>
        ) : customers.length === 0 ? (
          <div className={styles.sectionBody}>
            <EmptyState icon={Users} title={t("crm.noCustomers")} description={t("crm.emptyDesc")} />
          </div>
        ) : (
          <>
            <div className={styles.tableHead}>
              <span>{t("home.col.customer")}</span>
              <span>{t("common.phone")}</span>
              <span>{t("list.col.manager")}</span>
              <span className={styles.tableHeadRight}>{t("crm.turnover")}</span>
              <span className={styles.tableHeadRight}>{t("common.debt")}</span>
              <span aria-hidden />
            </div>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} className={styles.tableBody}>
              {customers.map((c) => {
                const debt = D(c.debt);
                return (
                  <li key={c.id}>
                    <Link href={`/crm/customers/${c.id}`} className={styles.tableRow}>
                      <span className={styles.customerName}>{c.name}</span>
                      <span className={styles.cellText}>{c.phone ?? "—"}</span>
                      <span className={styles.cellText}>{c.managerName ?? t("crm.noManager")}</span>
                      <span className={styles.cellMoney}>{moneyDisplay(c.turnover)} с</span>
                      <span className={debt.gt(0) ? styles.cellDebt : styles.cellMoney}>
                        {debt.gt(0) ? `${moneyDisplay(debt)} с` : "—"}
                      </span>
                      <span className={styles.chevron} aria-hidden>
                        <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </RevealList>

            <ul className={styles.mobileList}>
              {customers.map((c) => {
                const debt = D(c.debt);
                return (
                  <li key={c.id}>
                    <Link href={`/crm/customers/${c.id}`} className={styles.mobileCard}>
                      <div className={styles.mobileTop}>
                        <span className={styles.mobileName}>{c.name}</span>
                        <span className={styles.chevron} aria-hidden>
                          <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                        </span>
                      </div>
                      <p className={styles.mobileMeta}>
                        {c.phone ?? "—"} · {c.managerName ?? t("crm.noManager")}
                      </p>
                      <div className={styles.mobileBottom}>
                        <div className={styles.mobileStats}>
                          <span>{moneyDisplay(c.turnover)} с</span>
                          {debt.gt(0) ? (
                            <span style={{ color: "var(--danger)" }}>{moneyDisplay(debt)} с</span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
