import { getTranslator } from "@/lib/locale";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { createCustomer } from "@/app/actions/customers";
import { createLead, moveLead } from "@/app/actions/leads";
import { PipelineCard } from "./pipeline-card";
import { D, moneyDisplay } from "@core/shared/decimal";
import { RevealList } from "@/components/reveal-list";
import { PageHeader } from "@/components/page-header";
import { pipelineStageStyle } from "@core/shared/pipeline-stage-style";
import {
  DataList,
  DataListCell,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  dataListStyles,
} from "@/components/data-list";
import styles from "./crm.module.css";

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

  return (
    <div className="page-stack">
      <PageHeader
        title={t("page.crm")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/crm/history" className="ui-btn-secondary">
              {t("crm.purchaseHistory")}
            </Link>
            <Link href="/orders" className="ui-btn-secondary">
              {t("page.orders")}
            </Link>
          </div>
        }
      />
      {canManage ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form action={customerAction} className="space-y-2 ui-card p-4" data-tour="crm-new">
            <h2 className="text-sm font-semibold">{t("crm.newCustomer")}</h2>
            <input name="name" required placeholder={t("crm.fioCompany")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="phone" placeholder={t("common.phone")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="whatsapp" placeholder={t("common.whatsapp")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="address" placeholder={t("common.address")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="source" placeholder={t("common.source")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <textarea name="comment" placeholder={t("common.comment")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <button className="ui-btn-primary">{t("common.save")}</button>
          </form>
          <form action={leadAction} className="space-y-2 ui-card p-4" data-tour="crm-lead">
            <h2 className="text-sm font-semibold">{t("crm.newLead")}</h2>
            <input name="name" required placeholder={t("crm.leadName")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="phone" placeholder={t("common.phone")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <select name="customerId" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              <option value="">{t("crm.noCustomerCard")}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <textarea name="comment" placeholder={t("common.comment")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <button className="ui-btn-primary">{t("crm.toPipeline")}</button>
          </form>
        </div>
      ) : null}

      <section data-tour="crm-pipeline">
        <h2 className="mb-3 text-sm font-semibold">{t("crm.pipeline")}</h2>
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
      </section>

      <section className="ui-card overflow-hidden">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">{t("crm.customers")}</h2>
        </div>
        {customers.length === 0 ? (
          <DataListEmpty>{t("crm.noCustomers")}</DataListEmpty>
        ) : (
          <DataList layout="cols4">
            <DataListHead layout="cols4">
              <DataListHeadCell>{t("home.col.customer")}</DataListHeadCell>
              <DataListHeadCell>{t("list.col.manager")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("crm.turnover")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.debt")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} className={dataListStyles.rows}>
              {customers.map((c) => {
                const turnover = c.orders.reduce((s, o) => s.add(String(o.total)), D(0));
                const debt = c.orders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
                return (
                  <DataListRow key={c.id} layout="cols4">
                    <DataListPrimary title={c.name} href={`/crm/customers/${c.id}`} />
                    <DataListCell label={t("list.col.manager")}>
                      {c.manager?.name ?? t("crm.noManager")}
                    </DataListCell>
                    <DataListMetric label={t("crm.turnover")} value={`${moneyDisplay(turnover)} с`} tone="good" />
                    <DataListMetric
                      label={t("common.debt")}
                      value={`${moneyDisplay(debt)} с`}
                      tone={debt.gt(0) ? "bad" : "muted"}
                    />
                  </DataListRow>
                );
              })}
            </RevealList>
          </DataList>
        )}
      </section>
    </div>
  );
}
