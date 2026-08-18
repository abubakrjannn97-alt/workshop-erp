import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { orderNo } from "@core/shared/format";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import {
  DataList,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  DataListCell,
  dataListStyles,
} from "@/components/data-list";
import { StatusBadge, orderTone } from "@/components/status-badge";

export default async function CrmHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; q?: string }>;
}) {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("crm.view");
  const { customerId, q } = await searchParams;
  const own = session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {};
  const loc = intlLocale(locale);

  const customers = customerId
    ? []
    : await prisma.customer.findMany({
        where: {
          archivedAt: null,
          ...own,
          ...(q?.trim()
            ? {
                OR: [
                  { name: { contains: q.trim(), mode: "insensitive" } },
                  { phone: { contains: q.trim(), mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { name: "asc" },
        take: 30,
      });

  const customer = customerId
    ? await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          manager: true,
          orders: { include: { status: true }, orderBy: { createdAt: "desc" } },
        },
      })
    : null;

  if (customerId && !customer) notFound();
  if (
    customer &&
    session.user.roleCode === "sales_manager" &&
    customer.managerId !== session.user.id
  ) {
    redirect("/crm/history");
  }

  const turnover = customer
    ? customer.orders.reduce((s, o) => s.add(String(o.total)), D(0))
    : D(0);
  const debt = customer
    ? customer.orders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0))
    : D(0);

  return (
    <div className="page-stack">
      <PageHeader
        title={t("crm.purchaseHistory")}
        description={t("crm.purchaseHistoryHint")}
        actions={
          <Link href="/orders" className="ui-btn-secondary">
            {t("page.orders")}
          </Link>
        }
      />

      <form className="ui-card flex flex-wrap gap-2 p-3">
        <label className="min-w-[12rem] flex-1 text-sm">
          <span className="ui-label">{t("crm.searchCustomer")}</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("crm.searchCustomer")}
            className="ui-input mt-1 w-full"
          />
        </label>
        <button type="submit" className="ui-btn-secondary self-end">
          {t("common.search")}
        </button>
      </form>

      {!customerId ? (
        <section className="ui-card overflow-hidden">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="text-sm font-semibold">{t("crm.pickCustomer")}</h2>
          </div>
          {customers.length === 0 ? (
            <DataListEmpty>{q?.trim() ? t("orders.empty") : t("crm.noCustomers")}</DataListEmpty>
          ) : (
            <DataList layout="cols2">
              <DataListHead layout="cols2">
                <DataListHeadCell>{t("home.col.customer")}</DataListHeadCell>
                <DataListHeadCell align="right">{t("common.open")}</DataListHeadCell>
              </DataListHead>
              <ul className={dataListStyles.rows}>
                {customers.map((c) => (
                  <DataListRow key={c.id} layout="cols2">
                    <DataListPrimary title={c.name} subtitle={c.phone ?? undefined} />
                    <DataListCell label={t("common.open")} align="right">
                      <Link href={`/crm/history?customerId=${c.id}`} className="text-[12px] font-semibold text-[#0E1522] hover:underline">
                        {t("crm.purchaseHistory")} →
                      </Link>
                    </DataListCell>
                  </DataListRow>
                ))}
              </ul>
            </DataList>
          )}
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/crm/history" className="text-[12px] text-[var(--muted)] hover:underline">
              ← {t("crm.pickCustomer")}
            </Link>
            <Link href={`/crm/customers/${customer!.id}`} className="text-[12px] hover:underline">
              {t("orders.customerCard")}
            </Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            <KpiCard label={t("home.col.customer")} value={customer!.name} tone="ink" />
            <KpiCard label={t("crm.purchases")} value={`${moneyDisplay(turnover)} с`} tone="in" />
            <KpiCard label={t("common.debt")} value={`${moneyDisplay(debt)} с`} tone="out" />
            <KpiCard label={t("crm.orderHistory")} value={String(customer!.orders.length)} tone="ink" />
          </div>

          <section className="ui-card overflow-hidden">
            <div className="border-b border-[var(--line)] px-4 py-3">
              <h2 className="text-sm font-semibold">{t("crm.orderHistory")}</h2>
              <p className="mt-1 text-[12px] text-[var(--muted)]">{t("orders.periodAll")}</p>
            </div>
            {customer!.orders.length === 0 ? (
              <DataListEmpty>{t("crm.noOrders")}</DataListEmpty>
            ) : (
              <DataList layout="colsOrders">
                <DataListHead layout="colsOrders">
                  <DataListHeadCell>{t("home.col.order")}</DataListHeadCell>
                  <DataListHeadCell>{t("list.col.when")}</DataListHeadCell>
                  <DataListHeadCell align="right">{t("home.col.amount")}</DataListHeadCell>
                  <DataListHeadCell align="right">{t("home.col.status")}</DataListHeadCell>
                </DataListHead>
                <ul className={dataListStyles.rows}>
                  {customer!.orders.map((o) => {
                    const rowDebt = D(String(o.total)).sub(o.paidAmount);
                    return (
                      <DataListRow key={o.id} layout="colsOrders">
                        <DataListPrimary title={orderNo(o.number)} href={`/orders/${o.id}`} />
                        <DataListCell label={t("list.col.when")}>
                          {o.createdAt.toLocaleDateString(loc)}
                        </DataListCell>
                        <DataListMetric
                          label={t("home.col.amount")}
                          value={`${moneyDisplay(o.total)} с`}
                          tone={rowDebt.gt(0) ? "bad" : "good"}
                        />
                        <DataListCell label={t("home.col.status")} align="right">
                          <StatusBadge
                            label={n("ostatus", o.status.code, o.status.name)}
                            tone={orderTone(o.status.code)}
                          />
                        </DataListCell>
                      </DataListRow>
                    );
                  })}
                </ul>
              </DataList>
            )}
          </section>
        </>
      )}
    </div>
  );
}
