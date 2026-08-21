import Link from "next/link";
import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { qtyDisplay, D } from "@core/shared/decimal";
import { getRawWarehouse } from "@/core/config/resolve-warehouse";
import { receiveOpening, addRawMaterialToWarehouse } from "@/app/actions/inventory";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { PendingButton } from "@/components/pending-button";
import { PageHeader } from "@/components/page-header";
import { IdempotencyField } from "@/components/idempotency-field";

export default async function AddWarehouseMaterialPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const { t } = await getTranslator();
  const session = await requirePermission("inventory.view");
  if (!hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive")) {
    redirect("/warehouse");
  }
  const { error, mode } = await searchParams;
  const isNew = mode === "new";
  const raw = await getRawWarehouse();

  const materials = await prisma.material.findMany({
    where: { archivedAt: null, isActive: true },
    include: { storageUnit: true, stockItems: { where: { warehouseId: raw.id } } },
    orderBy: { name: "asc" },
  });

  const lowFirst = [...materials].sort((a, b) => {
    const aLow = D(String(a.stockItems[0]?.qtyOnHand ?? 0)).lt(a.minStock) ? 0 : 1;
    const bLow = D(String(b.stockItems[0]?.qtyOnHand ?? 0)).lt(b.minStock) ? 0 : 1;
    return aLow - bLow || a.name.localeCompare(b.name, "ru");
  });

  async function receiveExisting(formData: FormData) {
    "use server";
    formData.set("warehouseId", raw.id);
    const result = await receiveOpening(formData);
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
  }

  return (
    <div className="page-stack max-w-xl" style={{ gap: "10px" }}>
      <PageHeader title={t("wh.addMaterial")} backHref="/warehouse" backLabel={t("common.back")} />
      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      {!isNew ? (
        <form action={receiveExisting} className="ui-card grid gap-2.5 p-3.5">
          <IdempotencyField prefix="wh-raw-receive" />
          <FormField label={t("common.material")} required>
            <AppSelect
              name="materialId"
              defaultValue={lowFirst[0]?.id ?? ""}
              options={lowFirst.map((m) => {
                const onHand = qtyDisplay(m.stockItems[0]?.qtyOnHand ?? 0);
                const low = D(String(m.stockItems[0]?.qtyOnHand ?? 0)).lt(m.minStock);
                return {
                  value: m.id,
                  label: `${m.name} · ${onHand} ${m.storageUnit.symbol}${low ? " ↓" : ""}`,
                };
              })}
            />
          </FormField>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <FormField label={t("common.quantity")} required>
              <input name="quantity" required inputMode="decimal" className="ui-input" />
            </FormField>
            <FormField label={t("common.unitPrice")} required>
              <input
                name="unitCost"
                required
                inputMode="decimal"
                className="ui-input"
                defaultValue={
                  lowFirst[0]?.lastPurchasePrice ? String(lowFirst[0].lastPurchasePrice) : ""
                }
              />
            </FormField>
          </div>
          <PendingButton className="ui-btn-primary min-h-[40px] w-full" pendingLabel={t("common.sending")}>
            {t("wh.addMaterial")}
          </PendingButton>
          <Link
            href="/warehouse/add?mode=new"
            className="text-center text-[13px] text-[var(--ink-2)] underline-offset-2 hover:underline"
          >
            {t("wh.addMaterialNew")}
          </Link>
        </form>
      ) : (
        <form action={createNew} className="ui-card grid gap-2.5 p-3.5">
          <IdempotencyField prefix="wh-add" />
          <FormField label={t("common.name")} required>
            <input name="name" required autoFocus placeholder={t("wh.addMaterialNamePh")} className="ui-input" />
          </FormField>
          <FormField label={t("common.category")}>
            <input name="category" placeholder={t("wh.addMaterialCategoryPh")} className="ui-input" />
          </FormField>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <FormField label={t("common.quantity")} required>
              <input name="quantity" required inputMode="decimal" placeholder="100" className="ui-input" />
            </FormField>
            <FormField label={t("common.unitPrice")} required>
              <input name="unitCost" required inputMode="decimal" placeholder="4.50" className="ui-input" />
            </FormField>
          </div>
          <PendingButton className="ui-btn-primary min-h-[40px] w-full" pendingLabel={t("common.sending")}>
            {t("wh.addMaterial")}
          </PendingButton>
          <Link
            href="/warehouse/add"
            className="text-center text-[13px] text-[var(--ink-2)] underline-offset-2 hover:underline"
          >
            {t("common.back")}
          </Link>
        </form>
      )}
    </div>
  );
}
