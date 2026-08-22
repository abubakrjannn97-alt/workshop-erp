import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { qtyDisplay, D } from "@core/shared/decimal";
import { getRawWarehouse } from "@/core/config/resolve-warehouse";
import { loadPaymentCards } from "@core/config/payment-cards";
import { addRawMaterialToWarehouse } from "@/app/actions/inventory";
import { receiveSupplierIntake } from "@/app/actions/purchasing";
import { PageHeader } from "@/components/page-header";
import { WarehouseIntakeForm } from "./warehouse-intake-form";
import { WarehouseNewMaterialForm } from "./warehouse-new-material-form";

export default async function AddWarehouseMaterialPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; material?: string; qty?: string }>;
}) {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("inventory.view");
  if (!hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive")) {
    redirect("/warehouse");
  }
  const { error, mode, material: materialId, qty } = await searchParams;
  const isNew = mode === "new";
  const raw = await getRawWarehouse();

  const [materials, suppliers, paymentCards] = await Promise.all([
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: { where: { warehouseId: raw.id } } },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
    loadPaymentCards(),
  ]);

  const lowFirst = [...materials].sort((a, b) => {
    const aLow = D(String(a.stockItems[0]?.qtyOnHand ?? 0)).lt(a.minStock) ? 0 : 1;
    const bLow = D(String(b.stockItems[0]?.qtyOnHand ?? 0)).lt(b.minStock) ? 0 : 1;
    return aLow - bLow || a.name.localeCompare(b.name, "ru");
  });

  const selectedMaterial =
    materialId && materials.some((m) => m.id === materialId)
      ? materialId
      : (lowFirst[0]?.id ?? "");
  const selectedRow = materials.find((m) => m.id === selectedMaterial) ?? lowFirst[0];
  const defaultQty = qty?.trim() || "";
  const defaultUnitCost = selectedRow?.lastPurchasePrice ? String(selectedRow.lastPurchasePrice) : "";

  const materialOptions = lowFirst.map((m) => {
    const onHand = qtyDisplay(m.stockItems[0]?.qtyOnHand ?? 0);
    const low = D(String(m.stockItems[0]?.qtyOnHand ?? 0)).lt(m.minStock);
    return {
      id: m.id,
      label: `${m.name} · ${onHand} ${m.storageUnit.symbol}${low ? " ↓" : ""}`,
      defaultUnitCost: m.lastPurchasePrice ? String(m.lastPurchasePrice) : "",
    };
  });

  async function receiveExisting(formData: FormData) {
    "use server";
    const result = await receiveSupplierIntake(formData);
    if (result?.error) {
      redirect(`/warehouse/add?error=${encodeURIComponent(result.error)}`);
    }
    redirect("/warehouse?view=raw");
  }

  async function createNew(formData: FormData) {
    "use server";
    const result = await addRawMaterialToWarehouse(formData);
    if (result?.error) {
      redirect(`/warehouse/add?mode=new&error=${encodeURIComponent(result.error)}`);
    }
    redirect("/warehouse?view=raw");
  }

  return (
    <div className="page-stack max-w-xl" style={{ gap: "10px" }}>
      <PageHeader title={t("wh.addMaterial")} backHref="/warehouse?view=raw" backLabel={t("common.back")} />
      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      {!isNew ? (
        <WarehouseIntakeForm
          locale={locale}
          materials={materialOptions}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          paymentCards={paymentCards.filter((c) => c.isActive)}
          selectedMaterialId={selectedMaterial}
          defaultQty={defaultQty}
          defaultUnitCost={defaultUnitCost}
          warehouseId={raw.id}
          receiveAction={receiveExisting}
          addSupplierHref="/purchasing/suppliers"
        />
      ) : (
        <WarehouseNewMaterialForm
          locale={locale}
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          paymentCards={paymentCards.filter((c) => c.isActive)}
          warehouseId={raw.id}
          createAction={createNew}
          addSupplierHref="/purchasing/suppliers"
        />
      )}
    </div>
  );
}
