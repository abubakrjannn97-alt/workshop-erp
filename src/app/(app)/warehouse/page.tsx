import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { getRawWarehouse } from "@/core/config/resolve-warehouse";
import { WarehouseMetrics } from "./warehouse-metrics";
import { Plus } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./warehouse.module.css";

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const canReceive = hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive");
  const params = await searchParams;

  const raw = await getRawWarehouse();

  const [materials, waitingCount, waitingOrders] = await Promise.all([
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: { where: { warehouseId: raw.id } } },
      orderBy: { name: "asc" },
    }),
    prisma.order.count({ where: { status: { code: { in: ["IN_FG", "READY"] } } } }),
    prisma.order.findMany({
      where: { status: { code: { in: ["IN_FG", "READY"] } } },
      include: { customer: true, items: { include: { product: true } } },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
  ]);

  const urgentMaterials = materials.filter((m) => {
    const stock = m.stockItems[0];
    return D(String(stock?.qtyOnHand ?? 0)).lt(m.minStock);
  });

  const metrics = [
    {
      id: "urgent",
      label: t("wh.kpiUrgentShortage"),
      value: String(urgentMaterials.length),
      hint: t("wh.kpiUrgentHint"),
      tone: "warn" as const,
      icon: "urgent" as const,
    },
    {
      id: "waiting",
      label: t("wh.kpiWaitingClient"),
      value: String(waitingCount),
      hint: t("wh.kpiWaitingHint"),
      tone: "green" as const,
      icon: "waiting" as const,
    },
  ];

  const activeId = params.view === "waiting" ? "waiting" : "urgent";

  return (
    <div className={styles.page}>
      <WarehouseMetrics items={metrics} activeId={activeId} />

      <div className={styles.toolbar}>
        <WarehouseNav current="raw" locale={locale} />
        {canReceive ? (
          <Link href="/warehouse/add" className={styles.iconBtn} aria-label={t("wh.addMaterial")}>
            <Plus size={18} strokeWidth={ICON_STROKE} />
          </Link>
        ) : null}
      </div>

      {activeId === "urgent" ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("wh.urgentList")}</h2>
          </div>
          {urgentMaterials.length === 0 ? (
            <div className={styles.sectionBody}>
              <p className={styles.emptyNote}>{t("common.empty")}</p>
            </div>
          ) : (
            <ul className={styles.alertList}>
              {urgentMaterials.map((material) => {
                const stock = material.stockItems[0];
                const onHand = D(String(stock?.qtyOnHand ?? 0));
                const need = D(String(material.minStock)).sub(onHand);
                return (
                  <li key={material.id}>
                    <Link href="/warehouse/add" className={styles.alertItemLink}>
                      <div className={styles.alertMain}>
                        <p className={styles.alertName}>{material.name}</p>
                        <p className={styles.alertMeta}>
                          {qtyDisplay(onHand)} / {qtyDisplay(material.minStock)} {material.storageUnit.symbol}
                          {need.gt(0) ? ` · −${qtyDisplay(need)}` : null}
                        </p>
                        <p className={styles.alertHint}>{t("wh.urgentAddHint")}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("wh.waitingList")}</h2>
          </div>
          {waitingOrders.length === 0 ? (
            <div className={styles.sectionBody}>
              <p className={styles.emptyNote}>{t("common.empty")}</p>
            </div>
          ) : (
            <ul className={styles.alertList}>
              {waitingOrders.map((order) => (
                <li key={order.id}>
                  <Link href={`/orders/${order.id}`} className={styles.alertItemLink}>
                    <div className={styles.alertMain}>
                      <p className={styles.alertName}>{order.customer.name}</p>
                      <p className={styles.alertMeta}>
                        #{order.number} · {order.items[0]?.product.name ?? "—"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
