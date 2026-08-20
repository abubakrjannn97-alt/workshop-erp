import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { createPurchaseFromShortage } from "@/app/actions/purchasing";
import { getRawWarehouse } from "@/core/config/resolve-warehouse";
import { WarehouseMetrics } from "./warehouse-metrics";
import { Plus } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./warehouse.module.css";

export default async function WarehousePage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const canReceive = hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive");
  const canBuy = hasPermission(session.user.permissions, session.user.roleCode, "purchasing.manage");

  const raw = await getRawWarehouse();

  const [materials, waitingCount, waitingOrders, suppliers] = await Promise.all([
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
      take: 10,
    }),
    canBuy ? prisma.supplier.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" }, take: 1 }) : Promise.resolve([]),
  ]);

  const urgentMaterials = materials.filter((m) => {
    const stock = m.stockItems[0];
    return D(String(stock?.qtyOnHand ?? 0)).lte(m.minStock);
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("wh.rawTitle")}</h1>
        </div>
        {canReceive ? (
          <div className={styles.headerActions}>
            <Link href="/warehouse/add" className={styles.iconBtn} aria-label={t("wh.addMaterial")}>
              <Plus size={20} strokeWidth={ICON_STROKE} />
            </Link>
          </div>
        ) : null}
      </header>

      <WarehouseNav current="raw" locale={locale} />

      <WarehouseMetrics items={metrics} />

      {urgentMaterials.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("wh.urgentList")}</h2>
          </div>
          <ul className={styles.alertList}>
            {urgentMaterials.map((material) => {
              const stock = material.stockItems[0];
              const onHand = D(String(stock?.qtyOnHand ?? 0));
              const need = D(String(material.minStock)).sub(onHand);
              return (
                <li key={material.id} className={styles.alertItem}>
                  <div className={styles.alertMain}>
                    <p className={styles.alertName}>{material.name}</p>
                    <p className={styles.alertMeta}>
                      {qtyDisplay(onHand)} / {qtyDisplay(material.minStock)} {material.storageUnit.symbol}
                      {need.gt(0) ? ` · −${qtyDisplay(need)}` : null}
                    </p>
                  </div>
                  {canBuy && suppliers[0] && need.gt(0) ? (
                    <form action={createPurchaseFromShortage}>
                      <input type="hidden" name="supplierId" value={suppliers[0].id} />
                      <input type="hidden" name="materialId" value={material.id} />
                      <input type="hidden" name="quantity" value={need.toFixed(6)} />
                      <button type="submit" className={styles.actionBtn}>{t("wh.poRequest")}</button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {waitingOrders.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("wh.waitingList")}</h2>
          </div>
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
        </section>
      ) : null}
    </div>
  );
}
