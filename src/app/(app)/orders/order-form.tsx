"use client";

import { useMemo, useState } from "react";
import { D, moneyDisplay } from "@/lib/decimal";
import { PendingButton } from "@/components/pending-button";

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
}) {
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
    <form action={action} className="max-w-xl space-y-3 rounded-2xl border border-[var(--line)] bg-white p-6">
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
      <label className="block text-sm">
        <span className="font-medium">Клиент</span>
        <select
          name="customerId"
          required={!leadId}
          defaultValue={defaultCustomerId ?? ""}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">{leadId ? "Карточка из лида" : "Выберите"}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Изделие</span>
        <select
          name="productId"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            const next = products.find((p) => p.id === e.target.value);
            if (next) setPrice(next.price);
          }}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Количество, {product?.saleSymbol ?? "ед."}</span>
        <input
          name="quantity"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium">Цена за единицу</span>
        <input
          name="unitPrice"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          required
        />
        {product ? (
          <span className="mt-1 block text-xs text-slate-500">Минимум: {moneyDisplay(product.minPrice)}</span>
        ) : null}
      </label>
      {canDiscount ? (
        <label className="block text-sm">
          <span className="font-medium">Скидка, %</span>
          <input
            name="discountPercent"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-slate-500">Лимит без согласования: {discountLimit}%</span>
        </label>
      ) : (
        <input type="hidden" name="discountPercent" value="0" />
      )}
      {canChooseSeller ? (
        <label className="block text-sm">
          <span className="font-medium">Продавец</span>
          <select
            name="sellerId"
            defaultValue={defaultSellerId}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
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
        <span className="font-medium">Способ оплаты</span>
        <select name="paymentMethod" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="cash">Наличные</option>
          <option value="bank">Перевод</option>
          <option value="card">Карта</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium">Срок готовности</span>
        <input name="dueAt" type="date" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </label>
      <p className="text-sm">
        Сумма: <span className="font-semibold">{moneyDisplay(totals.total)} с</span>
      </p>
      <PendingButton className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white">
        Создать заказ
      </PendingButton>
    </form>
  );
}
