"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { quickSaleFromFg } from "@/app/actions/quick-sale";

export type QuickSaleCustomer = {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
};

export type QuickSaleProduct = {
  id: string;
  name: string;
  symbol: string;
  price: string;
  minPrice: string;
  onHand: string;
  photoUrl: string | null;
};

const NEW_CUSTOMER = "__new__";

export function QuickSaleForm({
  customers,
  products,
  labels,
}: {
  customers: QuickSaleCustomer[];
  products: QuickSaleProduct[];
  labels: {
    customer: string;
    newCustomer: string;
    customerName: string;
    phone: string;
    product: string;
    quantity: string;
    unitPrice: string;
    minPrice: string;
    stock: string;
    submit: string;
    sending: string;
    paidNow: string;
    unpaid: string;
    pay: string;
  };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? NEW_CUSTOMER);
  const [phone, setPhone] = useState(
    customers[0]?.phone || customers[0]?.whatsapp || "",
  );
  const [productId, setProductId] = useState(products[0]?.id ?? "");

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? products[0],
    [products, productId],
  );

  const isNew = customerId === NEW_CUSTOMER || customers.length === 0;

  function onCustomerChange(id: string) {
    setCustomerId(id);
    if (id === NEW_CUSTOMER) {
      setPhone("");
      return;
    }
    const c = customers.find((x) => x.id === id);
    setPhone(c?.phone || c?.whatsapp || "");
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await quickSaleFromFg(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/orders");
      router.refresh();
    });
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <form action={onSubmit} className="ui-card grid gap-3 p-3.5 max-w-xl">
      <IdempotencyField prefix="quick-sale" />
      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}

      <FormField label={labels.customer} required>
        <AppSelect
          name="customerId"
          value={isNew && customers.length === 0 ? NEW_CUSTOMER : customerId}
          onChange={onCustomerChange}
          options={[
            { value: NEW_CUSTOMER, label: labels.newCustomer },
            ...customers.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </FormField>

      {isNew ? (
        <FormField label={labels.customerName} required>
          <input name="customerName" required className="ui-input" autoComplete="name" />
        </FormField>
      ) : (
        <input type="hidden" name="customerName" value="" />
      )}

      <FormField label={labels.phone} required={isNew}>
        <input
          name="phone"
          className="ui-input"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required={isNew}
          placeholder="+992 …"
        />
      </FormField>

      <FormField label={labels.product} required>
        <AppSelect
          name="productId"
          value={productId}
          onChange={setProductId}
          options={products.map((p) => ({
            value: p.id,
            label: `${p.name} · ${p.onHand} ${p.symbol}`,
          }))}
        />
      </FormField>

      {selected ? (
        <p className="m-0 text-[13px] text-[var(--ink-2)]">
          {labels.minPrice}: <strong className="text-[var(--ink)]">{selected.minPrice} с</strong>
          {" · "}
          {labels.stock}: {selected.onHand} {selected.symbol}
        </p>
      ) : null}

      <FormField label={`${labels.quantity}${selected ? `, ${selected.symbol}` : ""}`} required>
        <input name="quantity" required className="ui-input" inputMode="decimal" defaultValue="1" />
      </FormField>

      <FormField label={`${labels.unitPrice}${selected ? `, с/${selected.symbol}` : ""}`} required>
        <input
          key={selected?.id ?? "price"}
          name="unitPrice"
          required
          className="ui-input"
          inputMode="decimal"
          defaultValue={selected?.price ?? "0"}
        />
      </FormField>

      <FormField label={labels.pay}>
        <select name="paidNow" className="ui-input" defaultValue="1">
          <option value="1">{labels.paidNow}</option>
          <option value="0">{labels.unpaid}</option>
        </select>
      </FormField>

      <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={labels.sending}>
        {labels.submit}
      </PendingButton>
    </form>
  );
}
