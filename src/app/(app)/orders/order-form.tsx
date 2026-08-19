"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { PendingButton } from "@/components/pending-button";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./order-form.module.css";

type Product = {
  id: string;
  name: string;
  minPrice: string;
  saleSymbol: string;
  price: string;
};

type Customer = { id: string; name: string };
type Seller = { id: string; name: string };

type OrderLine = {
  key: number;
  productId: string;
  quantity: string;
  unitPrice: string;
};

type InitialPayStatus = "unpaid" | "partial" | "paid";

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
  canAddCustomer,
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
  canAddCustomer?: boolean;
  locale: Locale;
}) {
  const t = createT(locale);
  const [lines, setLines] = useState<OrderLine[]>([
    { key: 1, productId: products[0]?.id ?? "", quantity: "1", unitPrice: products[0]?.price ?? "0" },
  ]);
  const [discount, setDiscount] = useState("0");
  const [discountOpen, setDiscountOpen] = useState(false);
  const [customerId, setCustomerId] = useState(defaultCustomerId ?? "");
  const [payStatus, setPayStatus] = useState<InitialPayStatus>("unpaid");
  const [partialPaid, setPartialPaid] = useState("");
  const [sellerId, setSellerId] = useState(defaultSellerId);
  const [nextKey, setNextKey] = useState(2);

  useEffect(() => {
    if (defaultCustomerId) setCustomerId(defaultCustomerId);
  }, [defaultCustomerId]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { key: nextKey, productId: products[0]?.id ?? "", quantity: "1", unitPrice: products[0]?.price ?? "0" },
    ]);
    setNextKey((k) => k + 1);
  };

  const removeLine = (key: number) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  };

  const updateLine = (key: number, field: keyof OrderLine, value: string) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        if (field === "productId") {
          const p = products.find((pr) => pr.id === value);
          return { ...l, productId: value, unitPrice: p?.price ?? l.unitPrice };
        }
        return { ...l, [field]: value };
      }),
    );
  };

  const totals = useMemo(() => {
    try {
      const subtotal = lines.reduce(
        (s, l) => s.add(D(l.quantity || "0").mul(l.unitPrice || "0")),
        D(0),
      );
      const disc = subtotal.mul(discount || "0").div(100);
      return { subtotal, total: subtotal.sub(disc) };
    } catch {
      return { subtotal: D(0), total: D(0) };
    }
  }, [lines, discount]);

  const isMulti = lines.length > 1;
  const payOptions = [
    { value: "unpaid", label: t("pay.unpaid") },
    { value: "partial", label: t("pay.partial") },
    { value: "paid", label: t("pay.paid") },
  ];

  const initialPaidAmount =
    payStatus === "paid" ? moneyDisplay(totals.total) : payStatus === "partial" ? partialPaid : "0";

  const addCustomerHref = useMemo(() => {
    const params = new URLSearchParams();
    if (leadId) params.set("leadId", leadId);
    const q = params.toString();
    return q ? `/orders/new/customer?${q}` : "/orders/new/customer";
  }, [leadId]);

  return (
    <form
      action={action}
      className={`ui-card ${styles.form}`}
      onSubmit={(event) => {
        if (!leadId && !customerId) {
          event.preventDefault();
          return;
        }
        if (payStatus === "partial" && !/^\d+(\.\d{1,4})?$/.test(partialPaid.trim())) {
          event.preventDefault();
        }
      }}
    >
      {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
      <input type="hidden" name="_multi" value={isMulti ? "1" : "0"} />
      <input type="hidden" name="initialPaymentStatus" value={payStatus} />
      <input type="hidden" name="initialPaidAmount" value={initialPaidAmount} />

      <FormField
        label={t("common.customer")}
        required={!leadId}
        className={styles.compactField}
        labelExtra={
          canAddCustomer && !leadId ? (
            <Link href={addCustomerHref} className={styles.addCustomerLink}>
              + {t("orders.addCustomer")}
            </Link>
          ) : null
        }
      >
        <AppSelect
          name="customerId"
          value={customerId}
          onChange={setCustomerId}
          required={!leadId}
          placeholder={leadId ? t("orders.leadCard") : t("orders.select")}
          options={[
            { value: "", label: leadId ? t("orders.leadCard") : t("orders.select") },
            ...customers.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </FormField>

      {lines.map((line, idx) => {
        const product = products.find((p) => p.id === line.productId);
        return (
          <div key={line.key} className={styles.lineBlock}>
            <div className={styles.lineHead}>
              <p className={styles.lineTitle}>
                {t("common.product")} {lines.length > 1 ? `#${idx + 1}` : ""}
              </p>
              {lines.length > 1 ? (
                <button type="button" onClick={() => removeLine(line.key)} className={styles.removeBtn}>
                  {t("common.remove")}
                </button>
              ) : null}
            </div>

            <FormField label={t("common.product")} required className={styles.compactField}>
              <AppSelect
                name={isMulti ? undefined : "productId"}
                value={line.productId}
                onChange={(value) => updateLine(line.key, "productId", value)}
                required
                options={products.map((p) => ({ value: p.id, label: p.name }))}
              />
              {isMulti ? <input type="hidden" name="productId[]" value={line.productId} /> : null}
            </FormField>

            <div className={styles.qtyPriceRow}>
              <FormField label={`${t("common.qty")}, ${product?.saleSymbol ?? ""}`} required className={styles.compactField}>
                <input
                  name={isMulti ? "quantity[]" : "quantity"}
                  value={line.quantity}
                  onChange={(e) => updateLine(line.key, "quantity", e.target.value)}
                  className="ui-input"
                  required
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t("orders.unitPrice")} hint={product ? `min: ${moneyDisplay(product.minPrice)}` : undefined} required className={styles.compactField}>
                <input
                  name={isMulti ? "unitPrice[]" : "unitPrice"}
                  value={line.unitPrice}
                  onChange={(e) => updateLine(line.key, "unitPrice", e.target.value)}
                  className="ui-input"
                  required
                  inputMode="decimal"
                />
              </FormField>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={addLine} className={styles.addItemBtn}>
        + {t("orders.addItem")}
      </button>

      {canDiscount ? (
        <div>
          {!discountOpen ? (
            <>
              <input type="hidden" name="discountPercent" value="0" />
              <button type="button" className={styles.discountToggle} onClick={() => setDiscountOpen(true)}>
                {t("orders.applyDiscount")}
              </button>
            </>
          ) : (
            <div className={styles.discountPanel}>
              <FormField label={t("orders.discountPct")} hint={`${t("orders.discountLimit")}: ${discountLimit}%`} className={styles.compactField}>
                <input
                  name="discountPercent"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="ui-input"
                  inputMode="decimal"
                  autoFocus
                />
              </FormField>
            </div>
          )}
        </div>
      ) : (
        <input type="hidden" name="discountPercent" value="0" />
      )}

      {canChooseSeller ? (
        <FormField label={t("orders.seller")} className={styles.compactField}>
          <AppSelect
            name="sellerId"
            value={sellerId}
            onChange={setSellerId}
            options={sellers.map((s) => ({ value: s.id, label: s.name }))}
          />
        </FormField>
      ) : (
        <input type="hidden" name="sellerId" value={defaultSellerId} />
      )}

      <FormField label={t("orders.payStatus")} className={styles.compactField}>
        <AppSelect
          value={payStatus}
          onChange={(value) => setPayStatus(value as InitialPayStatus)}
          options={payOptions}
        />
      </FormField>

      {payStatus === "partial" ? (
        <FormField label={t("orders.partialPayAmount")} className={styles.compactField}>
          <input
            value={partialPaid}
            onChange={(e) => setPartialPaid(e.target.value)}
            className="ui-input"
            inputMode="decimal"
            placeholder={moneyDisplay(totals.total)}
            required
          />
        </FormField>
      ) : null}

      <FormField label={t("orders.dueReady")} className={styles.compactField}>
        <input name="dueAt" type="date" className="ui-input" />
      </FormField>

      <div className={styles.footerRow}>
        <p className={styles.total}>
          {t("orders.sum")}: <span className="ui-num font-semibold">{moneyDisplay(totals.total)} с</span>
        </p>
        <PendingButton className="ui-btn-primary min-h-[44px] w-full sm:w-auto" pendingLabel={t("common.saving")}>
          {t("orders.create")}
        </PendingButton>
      </div>
    </form>
  );
}
