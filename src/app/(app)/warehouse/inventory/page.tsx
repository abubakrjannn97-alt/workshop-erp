import { PageHeader } from "@/components/page-header";
import { getTranslator, intlLocale } from "@/lib/locale";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { createInventoryCount } from "@/app/actions/inventory";

export default async function InventoryListPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("inventory.count");
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  const counts = await prisma.inventoryCount.findMany({
    orderBy: { createdAt: "desc" },
    include: { warehouse: true },
    take: 50,
  });

  return (
    <div className="page-stack">
      <div>
        <PageHeader title={t("wh.invTitle")} />
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {t("wh.invHint")}
        </p>
      </div>
      <WarehouseNav current="inventory" locale={locale} />
      <form action={createInventoryCount} className="flex gap-2 ui-card">
        <select name="warehouseId" className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <button className="ui-btn-primary">{t("wh.startCount")}</button>
      </form>
      <ul className="space-y-2">
        {counts.map((c) => (
          <li key={c.id} className="ui-card px-4 py-3 text-sm">
            <Link href={`/warehouse/inventory/${c.id}`} className="font-medium hover:underline">
              {n("wh", c.warehouse.code, c.warehouse.name)} · {c.createdAt.toLocaleString(intlLocale(locale))}
            </Link>
            <span className="ml-2 text-xs text-[var(--muted)]">{c.status === "DRAFT" ? t("wh.draft") : t("wh.posted")}</span>
          </li>
        ))}
      </ul>
      <p className="hidden">{session.user.id}</p>
    </div>
  );
}
