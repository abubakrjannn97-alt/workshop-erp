"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { quickSaleFromFg } from "@/app/actions/quick-sale";
import type { Locale } from "@core/shared/i18n/i18n";
import { PayDueCalendar } from "../pay-due-calendar";
import styles from "./quick-sale.module.css";

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

type PayMode = "paid" | "later" | "partial";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function QuickSaleForm({
  customers,
  products,
  locale = "ru",
  labels,
}: {
  customers: QuickSaleCustomer[];
  products: QuickSaleProduct[];
  locale?: Locale;
  labels: {
    customerName: string;
    pickCustomer: string;
    phone: string;
    product: string;
    quantity: string;
    unitPrice: string;
    minPrice: string;
    stock: string;
    submit: string;
    sending: string;
    pay: string;
    paid: string;
    later: string;
    partial: string;
    dueDate: string;
    paidAmount: string;
    noCustomers: string;
  };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const pickerRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [payMode, setPayMode] = useState<PayMode>("paid");
  const [partialAmount, setPartialAmount] = useState("");
  const [dueDay, setDueDay] = useState<number | null>(null);
  const [dueMonth, setDueMonth] = useState<number | null>(null);

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? products[0],
    [products, productId],
  );

  const year = new Date().getFullYear();
  const dueAtValue =
    dueDay != null && dueMonth != null
      ? `${year}-${String(dueMonth).padStart(2, "0")}-${String(Math.min(dueDay, daysInMonth(year, dueMonth))).padStart(2, "0")}`
      : "";

  useEffect(() => {
    if (!pickerOpen) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  function pickCustomer(c: QuickSaleCustomer) {
    setCustomerId(c.id);
    setCustomerName(c.name);
    setPhone(c.phone || c.whatsapp || "");
    setPickerOpen(false);
  }

  function onNameChange(value: string) {
    setCustomerName(value);
    if (customerId) setCustomerId("");
  }

  function onSubmit(formData: FormData) {
    setError(null);
    if (payMode === "later" && !dueAtValue) {
      setError("Укажите дату оплаты.");
      return;
    }
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

  if (products.length === 0) return null;

  return (
    <form action={onSubmit} className={styles.card}>
      <IdempotencyField prefix="quick-sale" />
      <input type="hidden" name="customerId" value={customerId || "__new__"} />
      <input type="hidden" name="payMode" value={payMode} />
      <input type="hidden" name="dueAt" value={payMode === "later" ? dueAtValue : ""} />

      {error ? <p className={styles.error}>{error}</p> : null}

      <FormField
        label={labels.customerName}
        required
        className={styles.field}
        labelExtra={
          customers.length > 0 ? (
            <button
              type="button"
              className={styles.pickLink}
              onClick={() => setPickerOpen((v) => !v)}
            >
              {labels.pickCustomer}
            </button>
          ) : null
        }
      >
        <div ref={pickerRef} className={styles.customerWrap}>
          <input
            name="customerName"
            required
            className="ui-input"
            autoComplete="name"
            value={customerName}
            onChange={(e) => onNameChange(e.target.value)}
          />
          {pickerOpen ? (
            <div className={styles.picker} role="listbox">
              {customers.length === 0 ? (
                <p className={styles.pickerEmpty}>{labels.noCustomers}</p>
              ) : (
                customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`${styles.pickerItem} ${c.id === customerId ? styles.pickerItemActive : ""}`}
                    onClick={() => pickCustomer(c)}
                  >
                    <span className={styles.pickerIcon} aria-hidden>
                      <UserRound size={16} strokeWidth={ICON_STROKE} />
                    </span>
                    <span className={styles.pickerText}>
                      <span className={styles.pickerName}>{c.name}</span>
                      <span className={styles.pickerPhone}>
                        {c.phone || c.whatsapp || "—"}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </FormField>

      <FormField label={labels.phone} required className={styles.field}>
        <input
          name="phone"
          className="ui-input"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="+992 …"
        />
      </FormField>

      <FormField label={labels.product} required className={styles.field}>
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
        <p className={styles.meta}>
          {labels.minPrice} <strong>{selected.minPrice} с</strong>
          <span className={styles.metaDot}>·</span>
          {labels.stock} {selected.onHand} {selected.symbol}
        </p>
      ) : null}

      <div className={styles.row2}>
        <FormField
          label={`${labels.quantity}${selected ? `, ${selected.symbol}` : ""}`}
          required
          className={styles.field}
        >
          <input name="quantity" required className="ui-input" inputMode="decimal" defaultValue="1" />
        </FormField>
        <FormField
          label={`${labels.unitPrice}${selected ? `, с/${selected.symbol}` : ""}`}
          required
          className={styles.field}
        >
          <input
            key={selected?.id ?? "price"}
            name="unitPrice"
            required
            className="ui-input"
            inputMode="decimal"
            defaultValue={selected?.price ?? "0"}
          />
        </FormField>
      </div>

      <div className={styles.payBlock}>
        <p className={styles.payLabel}>{labels.pay}</p>
        <div className={styles.paySeg} role="radiogroup" aria-label={labels.pay}>
          {(
            [
              ["paid", labels.paid],
              ["later", labels.later],
              ["partial", labels.partial],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={payMode === id}
              className={`${styles.payBtn} ${payMode === id ? styles.payBtnActive : ""}`}
              onClick={() => setPayMode(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {payMode === "later" ? (
          <FormField label={labels.dueDate} required className={styles.fieldTight}>
            <PayDueCalendar
              locale={locale}
              day={dueDay}
              month={dueMonth}
              autoFocus
              onChange={(d, m) => {
                setDueDay(d);
                setDueMonth(m);
              }}
            />
          </FormField>
        ) : null}

        {payMode === "partial" ? (
          <FormField label={labels.paidAmount} required className={styles.fieldTight}>
            <input
              name="paidAmount"
              required
              className="ui-input"
              inputMode="decimal"
              value={partialAmount}
              onChange={(e) => setPartialAmount(e.target.value)}
              placeholder="0"
            />
          </FormField>
        ) : (
          <input type="hidden" name="paidAmount" value="" />
        )}
      </div>

      <PendingButton className={`ui-btn-primary ${styles.submit}`} pendingLabel={labels.sending}>
        {labels.submit}
      </PendingButton>
    </form>
  );
}
