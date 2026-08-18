import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { createCustomer } from "@/app/actions/customers";
import { createLead, moveLead } from "@/app/actions/leads";
import { PipelineCard } from "./pipeline-card";
import { D, moneyDisplay } from "@core/shared/decimal";
import { RevealList } from "@/components/reveal-list";
import { PageHeader } from "@/components/page-header";
import { pipelineStageStyle } from "@core/shared/pipeline-stage-style";
import { FormField } from "@/components/form-field";
import { DashPanel } from "@/components/dash-panel";
import { PendingButton } from "@/components/pending-button";
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
} from "@/components/data-table";
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
        description={t("crm.purchaseHistoryHint")}
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
          <DashPanel title={t("crm.newCustomer")} tour="crm-new">
            <form action={customerAction} className="grid gap-3">
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
              <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
                {t("common.save")}
              </PendingButton>
            </form>
          </DashPanel>
          <DashPanel title={t("crm.newLead")} tour="crm-lead">
            <form action={leadAction} className="grid gap-3">
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
              <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
                {t("crm.toPipeline")}
              </PendingButton>
            </form>
          </DashPanel>
        </div>
      ) : null}

      <DashPanel title={t("crm.pipeline")} tour="crm-pipeline">
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
      </DashPanel>

      <DashPanel title={t("crm.customers")} tour="crm-customers">
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
      </DashPanel>
    </div>
  );
}
