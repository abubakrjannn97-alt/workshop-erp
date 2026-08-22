"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, UserRound } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { FormField } from "@/components/form-field";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { quickSaleFromFg } from "@/app/actions/quick-sale";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import type { PaymentCard } from "@core/config/payment-cards";
import styles from "./quick-sale.module.css";

function formatFgStock(template: string, n: string, u: string) {
  return template.replaceAll("{n}", n).replaceAll("{u}", u);
}

function parseDec(raw: string) {
  const v = raw.trim().replace(",", ".");
  if (!v || v === "." || v === "-" || v.endsWith(".")) return null;
  try {
    const d = D(v);
    if (!d.isFinite()) return null;
    return d;
  } catch {
    return null;
  }
}

/** «Скала» from long catalog titles; else first meaningful chunk. */
function shortProductName(name: string) {
  const quoted = name.match(/[«"]([^»"]+)[»"]/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();
  const cleaned = name
    .replace(/^(декоративный\s+камень|цоколь|плитка)\s*/i, "")
    .trim();
  const base = cleaned || name.trim();
  return base.length > 22 ? `${base.slice(0, 20)}…` : base;
}

function shortPersonName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.length > 14 ? `${first.slice(0, 12)}…` : first || "—";
}

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
  costPerUnit: string;
  ratePerUnit: string;
  onHand: string;
  photoUrl: string | null;
};

type CartLine = {
  key: number;
  productId: string;
  name: string;
  symbol: string;
  photoUrl: string | null;
  quantity: string;
  unitPrice: string;
  amount: string;
};

type PayMode = "paid" | "partial" | "debt";
type PayChannel = "card" | "cash" | "split";

export function QuickSaleForm({
  customers,
  products,
  paymentCards,
  labels,
}: {
  customers: QuickSaleCustomer[];
  products: QuickSaleProduct[];
  paymentCards: PaymentCard[];
  labels: {
    customerName: string;
    pickCustomer: string;
    phone: string;
    product: string;
    quantity: string;
    unitPrice: string;
    addLine: string;
    finish: string;
    cancel: string;
    sending: string;
    pay: string;
    payStatus: string;
    paid: string;
    partial: string;
    debt: string;
    payMethod: string;
    payCard: string;
    payCash: string;
    paySplit: string;
    cardAmount: string;
    cashAmount: string;
    pickCard: string;
    paidAmount: string;
    noCustomers: string;
    forCustomer: string;
    cartTotal: string;
    clientLocked: string;
    fgStock: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const pickerRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [lineTotal, setLineTotal] = useState(() =>
    moneyDisplay(D(products[0]?.ratePerUnit ?? products[0]?.price ?? "0")),
  );
  const [priceTouched, setPriceTouched] = useState(false);
  const [sumUnlocked, setSumUnlocked] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [payMode, setPayMode] = useState<PayMode>("paid");
  const [payChannel, setPayChannel] = useState<PayChannel>("cash");
  const [cardId, setCardId] = useState(paymentCards[0]?.id ?? "");
  const [partialAmount, setPartialAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => `quick-sale-${crypto.randomUUID()}`);

  const saleLocked = cart.length > 0;

  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? products[0],
    [products, productId],
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum.plus(D(line.amount)), D(0)),
    [cart],
  );

  const reservedByProduct = useMemo(() => {
    const map = new Map<string, ReturnType<typeof D>>();
    for (const line of cart) {
      map.set(line.productId, (map.get(line.productId) ?? D(0)).plus(D(line.quantity)));
    }
    return map;
  }, [cart]);

  function calcLineTotal(product: QuickSaleProduct, qtyRaw: string) {
    const qty = parseDec(qtyRaw);
    if (!qty || !qty.gt(0)) return "";
    const rate = D(product.ratePerUnit || product.price || "0");
    return moneyDisplay(qty.mul(rate));
  }

  useEffect(() => {
    if (!pickerOpen && !productOpen) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (pickerOpen && pickerRef.current && !pickerRef.current.contains(target)) {
        setPickerOpen(false);
      }
      if (productOpen && productRef.current && !productRef.current.contains(target)) {
        setProductOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPickerOpen(false);
        setProductOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen, productOpen]);

  function pickCustomer(c: QuickSaleCustomer) {
    if (saleLocked) return;
    setCustomerId(c.id);
    setCustomerName(c.name);
    setPhone(c.phone || c.whatsapp || "");
    setPickerOpen(false);
  }

  function pickProduct(id: string) {
    const p = products.find((x) => x.id === id);
    setProductId(id);
    setQuantity("1");
    setPriceTouched(false);
    setSumUnlocked(false);
    if (p) setLineTotal(calcLineTotal(p, "1"));
    setProductOpen(false);
  }

  function onNameChange(value: string) {
    if (saleLocked) return;
    setCustomerName(value);
    if (customerId) setCustomerId("");
  }

  function onQuantityChange(value: string) {
    setQuantity(value);
    if (priceTouched || !selected) return;
    const next = calcLineTotal(selected, value);
    // Don't wipe a filled sum while quantity is being cleared/typed.
    if (next !== "") setLineTotal(next);
  }

  function onLineTotalChange(value: string) {
    setPriceTouched(true);
    setLineTotal(value);
  }

  function remainingStock(product: QuickSaleProduct) {
    const reserved = reservedByProduct.get(product.id) ?? D(0);
    return D(product.onHand).minus(reserved);
  }

  function resetLineFields(nextProductId = productId) {
    const p = products.find((x) => x.id === nextProductId) ?? products[0];
    setProductId(p?.id ?? "");
    setQuantity("1");
    setPriceTouched(false);
    setSumUnlocked(false);
    setLineTotal(p ? calcLineTotal(p, "1") : "");
  }

  function resetForm() {
    setError(null);
    setCustomerId("");
    setCustomerName("");
    setPhone("");
    setPickerOpen(false);
    setProductOpen(false);
    setCart([]);
    setPayMode("paid");
    setPayChannel("cash");
    setCardId(paymentCards[0]?.id ?? "");
    setPartialAmount("");
    setCardAmount("");
    setCashAmount("");
    resetLineFields(products[0]?.id);
  }

  function addToCart() {
    setError(null);
    if (!customerName.trim() || !phone.trim()) {
      setError("Укажите клиента и телефон.");
      return;
    }
    if (!selected) return;

    const qty = parseDec(quantity);
    const amount = parseDec(lineTotal);
    if (!qty || !qty.gt(0)) {
      setError("Укажите количество.");
      return;
    }
    if (!amount || amount.lt(0)) {
      setError("Сумма некорректна.");
      return;
    }
    const unitPrice = amount.div(qty);
    const left = remainingStock(selected);
    if (left.lt(qty)) {
      setError(
        `На складе ГП не хватает: нужно ${qtyDisplay(qty)} ${selected.symbol}, свободно ${qtyDisplay(left)}.`,
      );
      return;
    }

    setCart((prev) => [
      ...prev,
      {
        key: nextKey,
        productId: selected.id,
        name: selected.name,
        symbol: selected.symbol,
        photoUrl: selected.photoUrl,
        quantity: qty.toFixed(6),
        unitPrice: unitPrice.toFixed(4),
        amount: amount.toFixed(4),
      },
    ]);
    setNextKey((k) => k + 1);
    resetLineFields();
    setPickerOpen(false);
    setProductOpen(false);
  }

  function cancelSale() {
    resetForm();
  }

  function resolvePaymentAmounts() {
    const total = cartTotal;
    if (payMode === "debt") {
      return { paid: D(0), card: D(0), cash: D(0), ok: true as const };
    }
    if (payMode === "paid") {
      if (payChannel === "card") {
        if (!cardId) return { ok: false as const, error: "Выберите карту." };
        return { paid: total, card: total, cash: D(0), ok: true as const };
      }
      if (payChannel === "cash") {
        return { paid: total, card: D(0), cash: total, ok: true as const };
      }
      const card = parseDec(cardAmount) ?? D(0);
      const cash = parseDec(cashAmount) ?? D(0);
      if (!cardId) return { ok: false as const, error: "Выберите карту." };
      if (!card.plus(cash).eq(total)) {
        return { ok: false as const, error: "Сумма на карту и наличными должна равняться итогу." };
      }
      return { paid: total, card, cash, ok: true as const };
    }
    const received = parseDec(partialAmount);
    if (!received || !received.gt(0)) {
      return { ok: false as const, error: "Укажите полученную сумму." };
    }
    if (received.gte(total)) {
      return { ok: false as const, error: "Частичная оплата должна быть меньше итога." };
    }
    if (payChannel === "card") {
      if (!cardId) return { ok: false as const, error: "Выберите карту." };
      return { paid: received, card: received, cash: D(0), ok: true as const };
    }
    if (payChannel === "cash") {
      return { paid: received, card: D(0), cash: received, ok: true as const };
    }
    const card = parseDec(cardAmount) ?? D(0);
    const cash = parseDec(cashAmount) ?? D(0);
    if (!cardId) return { ok: false as const, error: "Выберите карту." };
    if (!card.plus(cash).eq(received)) {
      return { ok: false as const, error: "На карту и наличными должно равняться полученной сумме." };
    }
    return { paid: received, card, cash, ok: true as const };
  }

  function onFinish(formData: FormData) {
    setError(null);
    if (cart.length === 0) {
      setError("Добавьте хотя бы одно изделие.");
      return;
    }
    const pay = resolvePaymentAmounts();
    if (!pay.ok) {
      setError(pay.error);
      return;
    }
    formData.set("payChannel", payChannel);
    formData.set("cardId", payChannel === "cash" ? "" : cardId);
    formData.set("cardAmount", pay.card.toFixed(4));
    formData.set("cashAmount", pay.cash.toFixed(4));
    formData.set("paidAmount", pay.paid.toFixed(4));
    startTransition(async () => {
      const result = await quickSaleFromFg(formData);
      setIdempotencyKey(`quick-sale-${crypto.randomUUID()}`);
      if (result.error) {
        setError(result.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  }

  if (products.length === 0) return null;

  const selectedLeft = selected ? remainingStock(selected) : D(0);

  return (
    <>
      <div
        className={`${styles.wrap} ${cart.length > 0 ? styles.wrapWithCart : ""} ${productOpen || pickerOpen ? styles.wrapDropdownOpen : ""}`}
      >
        <div className={styles.card}>
        {error ? <p className={styles.error}>{error}</p> : null}

        <FormField
          label={labels.customerName}
          required
          className={styles.field}
          labelExtra={
            saleLocked ? (
              <span className={styles.lockHint}>{labels.clientLocked}</span>
            ) : customers.length > 0 ? (
              <button
                type="button"
                className={styles.pickLink}
                onClick={() => {
                  setProductOpen(false);
                  setPickerOpen((v) => !v);
                }}
              >
                {labels.pickCustomer}
              </button>
            ) : null
          }
        >
          <div ref={pickerRef} className={`${styles.customerWrap} ${pickerOpen ? styles.stackFront : ""}`}>
            <input
              required
              className="ui-input"
              autoComplete="name"
              value={customerName}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={saleLocked}
              readOnly={saleLocked}
            />
            {pickerOpen && !saleLocked ? (
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

        <div className={pickerOpen ? styles.maskedBelow : undefined}>
        <FormField label={labels.phone} required className={styles.field}>
          <input
            className="ui-input"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => {
              if (saleLocked) return;
              setPhone(e.target.value);
            }}
            required
            disabled={saleLocked}
            readOnly={saleLocked}
            placeholder="+992 …"
          />
        </FormField>

        <FormField label={labels.product} required className={styles.field}>
          <div ref={productRef} className={`${styles.productWrap} ${productOpen ? styles.stackFront : ""}`}>
            <button
              type="button"
              className={styles.productTrigger}
              aria-haspopup="listbox"
              aria-expanded={productOpen}
              onClick={() => {
                setPickerOpen(false);
                setProductOpen((v) => !v);
              }}
            >
              <span className={styles.productThumb}>
                {selected?.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.photoUrl} alt="" className={styles.productThumbImg} />
                ) : (
                  <span className={styles.productThumbEmpty}>
                    {(selected?.name ?? "?").slice(0, 1)}
                  </span>
                )}
              </span>
              <span className={styles.productTriggerText}>
                <span className={styles.productTriggerName}>{selected?.name ?? "—"}</span>
                <span className={styles.productTriggerMeta}>
                  {selected
                    ? formatFgStock(labels.fgStock, qtyDisplay(selectedLeft), selected.symbol)
                    : ""}
                </span>
              </span>
              <ChevronDown
                size={16}
                strokeWidth={ICON_STROKE}
                className={`${styles.productChevron} ${productOpen ? styles.productChevronOpen : ""}`}
                aria-hidden
              />
            </button>
            {productOpen ? (
              <div className={styles.productList} role="listbox">
                {products.map((p) => {
                  const left = remainingStock(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={p.id === productId}
                      className={`${styles.productOption} ${p.id === productId ? styles.productOptionActive : ""}`}
                      onClick={() => pickProduct(p.id)}
                    >
                      <span className={styles.productThumb}>
                        {p.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.photoUrl} alt="" className={styles.productThumbImg} />
                        ) : (
                          <span className={styles.productThumbEmpty}>{p.name.slice(0, 1)}</span>
                        )}
                      </span>
                      <span className={styles.productTriggerText}>
                        <span className={styles.productTriggerName}>{p.name}</span>
                        <span className={styles.productTriggerMeta}>
                          {formatFgStock(labels.fgStock, qtyDisplay(left), p.symbol)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </FormField>

        <div className={styles.row2}>
          <FormField
            label={`${labels.quantity}${selected ? `, ${selected.symbol}` : ""}`}
            required
            className={styles.field}
          >
            <input
              required
              className="ui-input"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
            />
          </FormField>
          <FormField label={labels.unitPrice} required className={styles.field}>
            <input
              required
              className={`ui-input ${sumUnlocked ? "" : styles.sumLocked}`}
              inputMode={sumUnlocked ? "decimal" : "none"}
              autoComplete="off"
              readOnly={!sumUnlocked}
              value={lineTotal}
              onClick={() => {
                setSumUnlocked(true);
                setPriceTouched(true);
              }}
              onFocus={() => {
                if (sumUnlocked) setPriceTouched(true);
              }}
              onChange={(e) => {
                if (!sumUnlocked) return;
                onLineTotalChange(e.target.value);
              }}
              onInput={(e) => {
                if (!sumUnlocked) return;
                onLineTotalChange((e.target as HTMLInputElement).value);
              }}
            />
          </FormField>
        </div>

        <button type="button" className={`ui-btn-primary ${styles.addBtn}`} onClick={addToCart}>
          {labels.addLine}
        </button>
        </div>
        </div>
      </div>

      {cart.length > 0 ? (
        <div className={styles.cartDock}>
          <div className={styles.cartPanel}>
            <div className={styles.cartHead}>
              <span className={styles.cartTitle}>{labels.cartTotal}</span>
              <span className={styles.cartHeadTotal}>{moneyDisplay(cartTotal)} с</span>
            </div>

            <div className={styles.receiptScroll}>
              <ul className={styles.receiptList}>
                {cart.map((line) => (
                  <li key={line.key} className={styles.receiptCard}>
                    <span className={styles.receiptThumb}>
                      {line.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={line.photoUrl} alt="" className={styles.receiptThumbImg} />
                      ) : (
                        <span className={styles.receiptThumbEmpty}>
                          {shortProductName(line.name).slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className={styles.receiptMain}>
                      <span className={styles.receiptName}>{shortProductName(line.name)}</span>
                      <span className={styles.receiptWho}>{shortPersonName(customerName)}</span>
                    </span>
                    <span className={styles.receiptMetrics}>
                      <span className={styles.receiptQty}>
                        {qtyDisplay(D(line.quantity))} {line.symbol}
                      </span>
                      <span className={styles.receiptSum}>{moneyDisplay(D(line.amount))} с</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <form action={onFinish} className={styles.checkout}>
              <IdempotencyField prefix="quick-sale" value={idempotencyKey} />
              <input type="hidden" name="customerId" value={customerId || "__new__"} />
              <input type="hidden" name="customerName" value={customerName} />
              <input type="hidden" name="phone" value={phone} />
              <input
                type="hidden"
                name="items"
                value={JSON.stringify(
                  cart.map((line) => ({
                    productId: line.productId,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                  })),
                )}
              />
              <input type="hidden" name="payMode" value={payMode} />

              <div className={styles.payBlock}>
                <p className={styles.payLabel}>{labels.payStatus}</p>
                <div className={styles.paySeg3} role="radiogroup">
                  {(
                    [
                      ["paid", labels.paid],
                      ["partial", labels.partial],
                      ["debt", labels.debt],
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

                {payMode !== "debt" ? (
                  <>
                    <p className={styles.payLabel}>{labels.payMethod}</p>
                    <div className={styles.paySeg3} role="radiogroup">
                      {(
                        [
                          ["card", labels.payCard],
                          ["cash", labels.payCash],
                          ["split", labels.paySplit],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={payChannel === id}
                          className={`${styles.payBtn} ${payChannel === id ? styles.payBtnActive : ""}`}
                          onClick={() => setPayChannel(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {payChannel !== "cash" && paymentCards.length > 0 ? (
                      <div className={styles.cardPicker}>
                        <p className={styles.paySubLabel}>{labels.pickCard}</p>
                        <div className={styles.cardGrid}>
                          {paymentCards.map((card) => (
                            <button
                              key={card.id}
                              type="button"
                              className={`${styles.cardOption} ${cardId === card.id ? styles.cardOptionActive : ""}`}
                              onClick={() => setCardId(card.id)}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={card.logoUrl} alt="" className={styles.cardLogo} />
                              <span className={styles.cardName}>{card.bank}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {payMode === "partial" ? (
                      <FormField label={labels.paidAmount} required className={styles.fieldTight}>
                        <input
                          required
                          className="ui-input"
                          inputMode="decimal"
                          value={partialAmount}
                          onChange={(e) => setPartialAmount(e.target.value)}
                          placeholder="0"
                        />
                      </FormField>
                    ) : null}

                    {payChannel === "split" ? (
                      <div className={styles.row2}>
                        <FormField label={labels.cardAmount} className={styles.fieldTight}>
                          <input
                            className="ui-input"
                            inputMode="decimal"
                            value={cardAmount}
                            onChange={(e) => setCardAmount(e.target.value)}
                            placeholder="0"
                          />
                        </FormField>
                        <FormField label={labels.cashAmount} className={styles.fieldTight}>
                          <input
                            className="ui-input"
                            inputMode="decimal"
                            value={cashAmount}
                            onChange={(e) => setCashAmount(e.target.value)}
                            placeholder="0"
                          />
                        </FormField>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className={styles.checkoutActions}>
                <PendingButton
                  className={`ui-btn-primary ${styles.finishBtn}`}
                  pendingLabel={labels.sending}
                  disabled={pending}
                >
                  {labels.finish}
                </PendingButton>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={cancelSale}
                  disabled={pending}
                >
                  {labels.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
