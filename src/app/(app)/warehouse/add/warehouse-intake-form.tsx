"use client";

import Link from "next/link";
import { useState } from "react";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { PendingButton } from "@/components/pending-button";
import { IdempotencyField } from "@/components/idempotency-field";
import { PurchasePayFields } from "@/components/purchase-pay-fields";
import type { PaymentCard } from "@core/config/payment-cards";
import { createT, type Locale } from "@core/shared/i18n/i18n";

type MaterialOpt = {
  id: string;
  label: string;
  defaultUnitCost: string;
};

type SupplierOpt = { id: string; name: string };

export function WarehouseIntakeForm({
  locale,
  materials,
  suppliers,
  paymentCards,
  selectedMaterialId,
  defaultQty,
  defaultUnitCost,
  warehouseId,
  receiveAction,
  addSupplierHref,
}: {
  locale: Locale;
  materials: MaterialOpt[];
  suppliers: SupplierOpt[];
  paymentCards: PaymentCard[];
  selectedMaterialId: string;
  defaultQty: string;
  defaultUnitCost: string;
  warehouseId: string;
  receiveAction: (formData: FormData) => Promise<void>;
  addSupplierHref: string;
}) {
  const t = createT(locale);
  const [materialId, setMaterialId] = useState(selectedMaterialId);
  const selected = materials.find((m) => m.id === materialId);

  return (
    <form action={receiveAction} className="ui-card grid gap-2.5 p-3.5">
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <IdempotencyField prefix="wh-raw-receive" />

      <FormField label={t("common.material")} required>
        <AppSelect
          name="materialId"
          value={materialId}
          onChange={setMaterialId}
          options={materials.map((m) => ({ value: m.id, label: m.label }))}
        />
      </FormField>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <FormField label={t("common.quantity")} required>
          <input name="quantity" required inputMode="decimal" className="ui-input" defaultValue={defaultQty} />
        </FormField>
        <FormField label={t("common.unitPrice")} required>
          <input
            name="unitCost"
            required
            inputMode="decimal"
            className="ui-input"
            defaultValue={selected?.defaultUnitCost || defaultUnitCost}
            key={materialId}
          />
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

      {suppliers.length > 0 ? (
        <PurchasePayFields locale={locale} paymentCards={paymentCards} totalHint={defaultUnitCost} />
      ) : null}

      <PendingButton
        className="ui-btn-primary min-h-[40px] w-full"
        pendingLabel={t("common.sending")}
        disabled={suppliers.length === 0}
      >
        {t("wh.addMaterial")}
      </PendingButton>

      <Link
        href="/warehouse/add?mode=new"
        className="text-center text-[13px] text-[var(--ink-2)] underline-offset-2 hover:underline"
      >
        {t("wh.addMaterialNew")}
      </Link>
    </form>
  );
}
