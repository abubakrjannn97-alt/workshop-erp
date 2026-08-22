import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasWorkerShell } from "@core/worker/worker-shell";
import { isProductionScopedWorker } from "@core/production/batch-auth";
import { qtyDisplay } from "@core/shared/decimal";
import { ProductionMetrics, type ProductionMetricItem } from "./production-metrics";
import styles from "./production.module.css";

const LIST_TAKE = 40;

type ProdRow = {
  id: string;
  plannedQty: unknown;
  producedQty: unknown;
  scrapQty: unknown;
  order: {
    customer: { name: string };
    items: { product: { name: string }; quantity: unknown }[];
  };
};

function productLabel(items: ProdRow["order"]["items"]) {
  if (items.length === 0) return "—";
  if (items.length === 1) return items[0].product.name;
  return items.map((i) => i.product.name).join(", ");
}

function toRows(list: ProdRow[], scrapOnly?: boolean): ProductionMetricItem["rows"] {
  return list.map((p) => {
    const meta = scrapOnly
      ? `${qtyDisplay(p.scrapQty)}`
      : `${qtyDisplay(p.producedQty)} / ${qtyDisplay(p.plannedQty)}`;
    return {
      id: p.id,
      href: `/production/${p.id}`,
      name: p.order.customer.name,
      product: productLabel(p.order.items),
      meta,
    };
  });
}

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { t } = await getTranslator();
  const session = await requirePermission("production.view");
  if (hasWorkerShell(session.user.roleCode, session.user.permissions ?? [])) redirect("/me");
  const params = await searchParams;

  const scoped = isProductionScopedWorker(session.user.roleCode, session.user.permissions ?? []);
  const scopedFilter = scoped ? { batches: { some: { responsibleUserId: session.user.id } } } : {};

  const include = {
    order: {
      select: {
        customer: { select: { name: true } },
        items: { select: { quantity: true, product: { select: { name: true } } } },
      },
    },
  } as const;

  const [inWorkList, openList, doneList, scrapList, inWork, open, done, withScrap] =
    await Promise.all([
      prisma.productionOrder.findMany({
        where: { status: "IN_PROGRESS", ...scopedFilter },
        include,
        orderBy: { updatedAt: "desc" },
        take: LIST_TAKE,
      }),
      prisma.productionOrder.findMany({
        where: { status: "OPEN", ...scopedFilter },
        include,
        orderBy: { updatedAt: "desc" },
        take: LIST_TAKE,
      }),
      prisma.productionOrder.findMany({
        where: { status: "DONE", ...scopedFilter },
        include,
        orderBy: { updatedAt: "desc" },
        take: LIST_TAKE,
      }),
      prisma.productionOrder.findMany({
        where: { scrapQty: { gt: 0 }, ...scopedFilter },
        include,
        orderBy: { updatedAt: "desc" },
        take: LIST_TAKE,
      }),
      prisma.productionOrder.count({ where: { status: "IN_PROGRESS", ...scopedFilter } }),
      prisma.productionOrder.count({ where: { status: "OPEN", ...scopedFilter } }),
      prisma.productionOrder.count({ where: { status: "DONE", ...scopedFilter } }),
      prisma.productionOrder.count({ where: { scrapQty: { gt: 0 }, ...scopedFilter } }),
    ]);

  const emptyLabel = t("prod.kpiEmptyList");
  const metrics: ProductionMetricItem[] = [
    {
      id: "in-progress",
      label: t("prod.inProgress"),
      value: String(inWork),
      hint: t("prod.kpiInProgressHint"),
      tone: "blue",
      icon: "inProgress",
      rows: toRows(inWorkList),
      emptyLabel,
    },
    {
      id: "waiting",
      label: t("prod.kpiWaiting"),
      value: String(open),
      hint: t("prod.kpiWaitingHint"),
      tone: "purple",
      icon: "waiting",
      rows: toRows(openList),
      emptyLabel,
    },
    {
      id: "done",
      label: t("prod.done"),
      value: String(done),
      hint: t("prod.kpiDoneHint"),
      tone: "green",
      icon: "done",
      rows: toRows(doneList),
      emptyLabel,
    },
    {
      id: "scrap",
      label: t("common.scrap"),
      value: String(withScrap),
      hint: t("prod.kpiScrapHint"),
      tone: "warn",
      icon: "scrap",
      rows: toRows(scrapList, true),
      emptyLabel,
    },
  ];

  const requested = params.view ?? "";
  const activeId = metrics.some((m) => m.id === requested) ? requested : metrics[0]!.id;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.production")}</h1>
        </div>
      </header>

      <ProductionMetrics items={metrics} activeId={activeId} />
    </div>
  );
}
