import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { createCustomer } from "@/app/actions/customers";
import { createLead, createLeadDocument, moveLead } from "@/app/actions/leads";
import { PipelineCard } from "./pipeline-card";
import { D, moneyDisplay } from "@core/shared/decimal";
import { RevealList } from "@/components/reveal-list";
import { pipelineStageStyle } from "@core/shared/pipeline-stage-style";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { ChevronRight, Plus, Users } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { EmptyState } from "@/components/empty-state";
import styles from "./customers.module.css";

export default async function CrmPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("crm.view");
  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "crm.manage");
  const own = session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {};

  const [customers, stages, leads] = await Promise.all([
    prisma.customer.findMany({
      where: { archivedAt: null, ...own },
      include: { orders: true, manager: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.leadStage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.lead.findMany({
      where: { archivedAt: null, ...own },
      include: { stage: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  async function customerAction(formData: FormData) {
    "use server";
    await createCustomer(formData);
  }
  async function leadAction(formData: FormData) {
    "use server";
    await createLead(formData);
  }
  async function moveAction(formData: FormData) {
    "use server";
    await moveLead(formData);
  }
  async function docAction(formData: FormData) {
    "use server";
    await createLeadDocument(formData);
  }

  return (
    <div className={styles.page}>
      {/* ─── Header ─── */}
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
            <a href="#crm-new" className={styles.primaryBtn}>
              <span className={styles.primaryBtnIcon} aria-hidden>
                <Plus size={16} strokeWidth={ICON_STROKE} />
              </span>
              {t("crm.newCustomer")}
            </a>
          ) : null}
          {canManage ? (
            <a href="#crm-new" className={styles.iconBtn} aria-label={t("crm.newCustomer")}>
              <Plus size={20} strokeWidth={ICON_STROKE} />
            </a>
          ) : null}
        </div>
      </header>

      {/* ─── Forms ─── */}
      {canManage ? (
        <div className={styles.formsGrid} id="crm-new">
          <section className={styles.section} data-tour="crm-new">
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("crm.newCustomer")}</h2>
            </div>
            <div className={styles.sectionBody}>
              <form action={customerAction} className={styles.formBody}>
                <FormField label={t("crm.fioCompany")}>
                  <input name="name" required placeholder={t("crm.fioCompany")} className="ui-input" />
                </FormField>
                <FormField label={t("common.phone")}>
                  <input name="phone" placeholder={t("common.phone")} className="ui-input" />
                </FormField>
                <FormField label={t("common.whatsapp")}>
                  <input name="whatsapp" placeholder={t("common.whatsapp")} className="ui-input" />
                </FormField>
                <FormField label={t("common.address")}>
                  <input name="address" placeholder={t("common.address")} className="ui-input" />
                </FormField>
                <FormField label={t("common.source")}>
                  <input name="source" placeholder={t("common.source")} className="ui-input" />
                </FormField>
                <FormField label={t("common.comment")}>
                  <textarea name="comment" placeholder={t("common.comment")} className="ui-input min-h-[4rem]" />
                </FormField>
                <div className={styles.formActions}>
                  <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
                    {t("common.save")}
                  </PendingButton>
                </div>
              </form>
            </div>
          </section>
          <section className={styles.section} data-tour="crm-lead">
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("crm.newLead")}</h2>
            </div>
            <div className={styles.sectionBody}>
              <form action={leadAction} className={styles.formBody}>
                <FormField label={t("crm.leadName")}>
                  <input name="name" required placeholder={t("crm.leadName")} className="ui-input" />
                </FormField>
                <FormField label={t("common.phone")}>
                  <input name="phone" placeholder={t("common.phone")} className="ui-input" />
                </FormField>
                <FormField label={t("crm.noCustomerCard")}>
                  <select name="customerId" className="ui-input">
                    <option value="">{t("crm.noCustomerCard")}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("common.comment")}>
                  <textarea name="comment" placeholder={t("common.comment")} className="ui-input min-h-[4rem]" />
                </FormField>
                <div className={styles.formActions}>
                  <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
                    {t("crm.toPipeline")}
                  </PendingButton>
                </div>
              </form>
            </div>
          </section>
        </div>
      ) : null}

      {/* ─── Documents form ─── */}
      {canManage ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("crm.documents")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={docAction} className={styles.docForm}>
              <FormField label={t("crm.newLead")}>
                <select name="leadId" className="ui-input" required>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("common.type")}>
                <select name="type" className="ui-input">
                  <option value="CALCULATION">{t("crm.docCalc")}</option>
                  <option value="OFFER">{t("crm.docOffer")}</option>
                </select>
              </FormField>
              <FormField label={t("common.name")}>
                <input name="title" required className="ui-input" />
              </FormField>
              <FormField label={`${t("common.amount")}, с`}>
                <input name="amount" className="ui-input" inputMode="decimal" />
              </FormField>
              <div className={styles.docFormFull}>
                <PendingButton className="ui-btn-secondary min-h-[44px]" pendingLabel={t("common.sending")}>
                  {t("crm.addDocument")}
                </PendingButton>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {/* ─── Pipeline ─── */}
      <section className={styles.section} data-tour="crm-pipeline">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("crm.pipeline")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <div className={`${styles.pipelineTrack} ui-scroll`}>
            {stages.map((stage) => {
              const column = leads.filter((l) => l.stageId === stage.id);
              const visual = pipelineStageStyle(stage.code);
              return (
                <div
                  key={stage.id}
                  className={styles.pipelineColumn}
                  style={
                    {
                      "--column-accent": visual.accent,
                      "--column-glow": visual.glow,
                      "--column-wash": visual.wash,
                      "--column-border": visual.border,
                    } as React.CSSProperties
                  }
                >
                  <p className={styles.pipelineHead}>
                    {n("lead", stage.code, stage.name)} · {column.length}
                  </p>
                  <div className={styles.pipelineBody}>
                    {column.map((lead) => (
                      <div key={lead.id}>
                        {canManage ? (
                          <PipelineCard
                            lead={{ id: lead.id, name: lead.name, stageId: lead.stageId }}
                            stages={stages}
                            action={moveAction}
                            locale={locale}
                            accent={visual.accent}
                            glow={visual.glow}
                          />
                        ) : (
                          <div
                            className="rounded-lg border p-3 text-sm"
                            style={{
                              borderColor: visual.border,
                              background: `linear-gradient(180deg, ${visual.wash} 0%, #fff 100%)`,
                              boxShadow: `0 0 14px ${visual.glow}`,
                            }}
                          >
                            <p className="font-medium">{lead.name}</p>
                          </div>
                        )}
                        {canManage && !stage.isLost ? (
                          <Link
                            href={`/orders/new?leadId=${lead.id}`}
                            className="mt-1 inline-block text-[11px] hover:underline"
                            style={{ color: visual.accent }}
                          >
                            {t("crm.createOrder")}
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Customer List ─── */}
      <section className={styles.section} data-tour="crm-customers">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("crm.customers")}</h2>
        </div>

        {customers.length === 0 ? (
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
                const turnover = c.orders.reduce((s, o) => s.add(String(o.total)), D(0));
                const debt = c.orders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
                return (
                  <li key={c.id}>
                    <Link href={`/crm/customers/${c.id}`} className={styles.tableRow}>
                      <span className={styles.customerName}>{c.name}</span>
                      <span className={styles.cellText}>{c.phone ?? "—"}</span>
                      <span className={styles.cellText}>{c.manager?.name ?? t("crm.noManager")}</span>
                      <span className={styles.cellMoney}>{moneyDisplay(turnover)} с</span>
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
                const turnover = c.orders.reduce((s, o) => s.add(String(o.total)), D(0));
                const debt = c.orders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
                return (
                  <li key={c.id}>
                    <Link href={`/crm/customers/${c.id}`} className={styles.mobileCard}>
                      <div className={styles.mobileTop}>
                        <span className={styles.mobileName}>{c.name}</span>
                        <span className={styles.chevron} aria-hidden>
                          <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                        </span>
                      </div>
                      <p className={styles.mobileMeta}>{c.phone ?? "—"} · {c.manager?.name ?? t("crm.noManager")}</p>
                      <div className={styles.mobileBottom}>
                        <div className={styles.mobileStats}>
                          <span>{moneyDisplay(turnover)} с</span>
                          {debt.gt(0) ? <span style={{ color: "var(--danger)" }}>{moneyDisplay(debt)} с</span> : null}
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
