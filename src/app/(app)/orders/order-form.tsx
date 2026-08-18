"use client";

import { useMemo, useState } from "react";
import { D, moneyDisplay } from "@core/shared/decimal";
import { PendingButton } from "@/components/pending-button";
import { createT, type Locale } from "@/lib/i18n";

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
    <form action={action} className="max-w-xl space-y-3 ui-card">
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
      <label className="block text-sm">
        <span className="font-medium">{t("common.customer")}</span>
        <select
          name="customerId"
          required={!leadId}
          defaultValue={defaultCustomerId ?? ""}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        >
          <option value="">{leadId ? t("orders.leadCard") : t("orders.select")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">{t("common.product")}</span>
        <select
          name="productId"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            const next = products.find((p) => p.id === e.target.value);
            if (next) setPrice(next.price);
          }}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">
          {t("orders.qtyWithUnit")}, {product?.saleSymbol ?? t("orders.unitFallback")}
        </span>
        <input
          name="quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">{t("orders.unitPrice")}</span>
        <input
          name="unitPrice"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          required
        />
        {product ? (
          <span className="mt-1 block text-xs text-[var(--muted)]">
            {t("orders.minPrice")}: {moneyDisplay(product.minPrice)}
          </span>
        ) : null}
      </label>
      {canDiscount ? (
        <label className="block text-sm">
          <span className="font-medium">{t("orders.discountPct")}</span>
          <input
            name="discountPercent"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-[var(--muted)]">
            {t("orders.discountLimit")}: {discountLimit}%
          </span>
        </label>
      ) : (
        <input type="hidden" name="discountPercent" value="0" />
      )}
      {canChooseSeller ? (
        <label className="block text-sm">
          <span className="font-medium">{t("orders.seller")}</span>
          <select
            name="sellerId"
            defaultValue={defaultSellerId}
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="sellerId" value={defaultSellerId} />
      )}
      <label className="block text-sm">
        <span className="font-medium">{t("orders.payMethod")}</span>
        <select name="paymentMethod" className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
          <option value="cash">{t("orders.cash")}</option>
          <option value="bank">{t("orders.transfer")}</option>
          <option value="card">{t("orders.card")}</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">{t("orders.dueReady")}</span>
        <input name="dueAt" type="date" className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
      </label>
      <p className="text-sm">
        {t("orders.sum")}: <span className="font-semibold">{moneyDisplay(totals.total)} с</span>
      </p>
      <PendingButton className="ui-btn-primary" pendingLabel={t("common.saving")}>
        {t("orders.create")}
      </PendingButton>
    </form>
  );
}
