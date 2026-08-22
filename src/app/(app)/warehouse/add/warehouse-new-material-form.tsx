"use client";

import Link from "next/link";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { PendingButton } from "@/components/pending-button";
import { IdempotencyField } from "@/components/idempotency-field";
import { PurchaseAccountPayFields } from "@/components/purchase-account-pay-fields";
import type { MoneyLocationCard } from "@core/finance/finance-summary";
import { createT, type Locale } from "@core/shared/i18n/i18n";

type SupplierOpt = { id: string; name: string };

export function WarehouseNewMaterialForm({
  locale,
  suppliers,
  payAccounts,
  warehouseId,
  createAction,
  addSupplierHref,
}: {
  locale: Locale;
  suppliers: SupplierOpt[];
  payAccounts: MoneyLocationCard[];
  warehouseId: string;
  createAction: (formData: FormData) => Promise<void>;
  addSupplierHref: string;
}) {
  const t = createT(locale);

  return (
    <form action={createAction} className="ui-card grid gap-2.5 p-3.5">
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <IdempotencyField prefix="wh-add" />

      <FormField label={t("common.name")} required>
        <input name="name" required autoFocus placeholder={t("wh.addMaterialNamePh")} className="ui-input" />
      </FormField>
      <div className="grid grid-cols-2 gap-2.5">
        <FormField label={t("common.quantity")} required>
          <input name="quantity" required inputMode="decimal" placeholder="100" className="ui-input" />
        </FormField>
        <FormField label={t("common.unitPrice")} required>
          <input name="unitCost" required inputMode="decimal" placeholder="4.50" className="ui-input" />
        </FormField>
      </div>

      <FormField
        label={t("common.supplier")}
        required
        labelExtra={
          <Link href={addSupplierHref} className="text-[12px] font-semibold text-[var(--accent,#A68649)] hover:underline">
            + {t("po.addSupplier")}
          </Link>
        }
      >
        {suppliers.length === 0 ? (
          <p className="m-0 text-sm text-[var(--ink-2)]">
            {t("po.noSuppliers")}{" "}
            <Link href={addSupplierHref} className="font-semibold underline">
              {t("po.addSupplier")}
            </Link>
          </p>
        ) : (
          <AppSelect
            name="supplierId"
            required
            defaultValue={suppliers[0]?.id ?? ""}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
        )}
      </FormField>

      {suppliers.length > 0 ? <PurchaseAccountPayFields locale={locale} payAccounts={payAccounts} /> : null}

      <PendingButton
        className="ui-btn-primary min-h-[40px] w-full"
        pendingLabel={t("common.sending")}
        disabled={suppliers.length === 0}
      >
        {t("wh.addMaterial")}
      </PendingButton>

      <Link href="/warehouse/add" className="text-center text-[13px] text-[var(--ink-2)] underline-offset-2 hover:underline">
        {t("common.back")}
      </Link>
    </form>
  );
}
