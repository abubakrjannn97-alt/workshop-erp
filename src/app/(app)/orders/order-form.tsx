"use client";

import { useMemo, useState } from "react";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { createT, type Locale } from "@core/shared/i18n/i18n";

type Product = {
  id: string;
  name: string;
  minPrice: string;
  saleSymbol: string;
  price: string;
};

type Customer = { id: string; name: string };
type Seller = { id: string; name: string };

export function OrderForm({
  action,
  customers,
  products,
  sellers,
  canChooseSeller,
  canDiscount,
  discountLimit,
  defaultSellerId,
  leadId,
  defaultCustomerId,
  locale,
}: {
  action: (formData: FormData) => Promise<void>;
  customers: Customer[];
  products: Product[];
  sellers: Seller[];
  canChooseSeller: boolean;
  canDiscount: boolean;
  discountLimit: string;
  defaultSellerId: string;
  leadId?: string;
  defaultCustomerId?: string;
  locale: Locale;
}) {
  const t = createT(locale);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const product = products.find((p) => p.id === productId);
  const [price, setPrice] = useState(product?.price ?? "0");
  const [discount, setDiscount] = useState("0");

  const totals = useMemo(() => {
    try {
      const subtotal = D(qty || "0").mul(price || "0");
      const disc = subtotal.mul(discount || "0").div(100);
      return { subtotal, total: subtotal.sub(disc) };
    } catch {
      return { subtotal: D(0), total: D(0) };
    }
  }, [qty, price, discount]);

  return (
    <form action={action} className="ui-card max-w-xl space-y-4 p-4">
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}

      <FormField label={t("common.customer")} required={!leadId}>
        <select
          name="customerId"
          required={!leadId}
          defaultValue={defaultCustomerId ?? ""}
          className="ui-input"
        >
          <option value="">{leadId ? t("orders.leadCard") : t("orders.select")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label={t("common.product")} required>
        <select
          name="productId"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            const next = products.find((p) => p.id === e.target.value);
            if (next) setPrice(next.price);
          }}
          className="ui-input"
          required
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label={`${t("orders.qtyWithUnit")}, ${product?.saleSymbol ?? t("orders.unitFallback")}`}
        required
      >
        <input
          name="quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="ui-input"
          required
          inputMode="decimal"
        />
      </FormField>

      <FormField
        label={t("orders.unitPrice")}
        hint={product ? `${t("orders.minPrice")}: ${moneyDisplay(product.minPrice)}` : undefined}
        required
      >
        <input
          name="unitPrice"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="ui-input"
          required
          inputMode="decimal"
        />
      </FormField>

      {canDiscount ? (
        <FormField label={t("orders.discountPct")} hint={`${t("orders.discountLimit")}: ${discountLimit}%`}>
          <input
            name="discountPercent"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="ui-input"
            inputMode="decimal"
          />
        </FormField>
      ) : (
        <input type="hidden" name="discountPercent" value="0" />
      )}

      {canChooseSeller ? (
        <FormField label={t("orders.seller")}>
          <select name="sellerId" defaultValue={defaultSellerId} className="ui-input">
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FormField>
      ) : (
        <input type="hidden" name="sellerId" value={defaultSellerId} />
      )}

      <FormField label={t("orders.payMethod")}>
        <select name="paymentMethod" className="ui-input" defaultValue="cash">
          <option value="cash">{t("orders.cash")}</option>
          <option value="bank">{t("orders.transfer")}</option>
          <option value="card">{t("orders.card")}</option>
        </select>
      </FormField>

      <FormField label={t("orders.dueReady")}>
        <input name="dueAt" type="date" className="ui-input" />
      </FormField>

      <p className="text-body">
        {t("orders.sum")}: <span className="ui-num font-semibold">{moneyDisplay(totals.total)} с</span>
      </p>

      <PendingButton className="ui-btn-primary min-h-[44px] w-full sm:w-auto" pendingLabel={t("common.saving")}>
        {t("orders.create")}
      </PendingButton>
    </form>
  );
}
