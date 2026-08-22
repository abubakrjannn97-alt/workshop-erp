"use client";

import { useState, useTransition } from "react";
import { savePaymentCards } from "@/app/actions/settings";
import type { PaymentCard } from "@core/config/payment-cards";
import { FormField } from "@/components/form-field";

export function PaymentCardsSettings({
  cards: initial,
  canEdit,
  labels,
}: {
  cards: PaymentCard[];
  canEdit: boolean;
  labels: {
    title: string;
    hint: string;
    name: string;
    bank: string;
    logoUrl: string;
    last4: string;
    add: string;
    save: string;
    sending: string;
  };
}) {
  const [cards, setCards] = useState(initial);
  const [name, setName] = useState("");
  const [bank, setBank] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [last4, setLast4] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addCard() {
    if (!name.trim() || !bank.trim() || !logoUrl.trim()) {
      setError("Заполните название, банк и ссылку на логотип.");
      return;
    }
    setError(null);
    const id = `card-${Date.now()}`;
    setCards((prev) => [
      ...prev,
      {
        id,
        name: name.trim(),
        bank: bank.trim(),
        logoUrl: logoUrl.trim(),
        last4: last4.trim() || undefined,
        isActive: true,
      },
    ]);
    setName("");
    setBank("");
    setLogoUrl("");
    setLast4("");
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("cardsJson", JSON.stringify(cards));
      const result = await savePaymentCards(fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="grid gap-3">
      <p className="m-0 text-[13px] leading-[18px] text-[var(--ink-2)]">{labels.hint}</p>
      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {cards.map((card) => (
          <li
            key={card.id}
            className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2"
          >
            <span className="grid h-9 w-14 shrink-0 place-items-center overflow-hidden rounded-md bg-[#f6f5f2]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.logoUrl} alt="" className="max-h-7 max-w-[52px] object-contain" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{card.name}</span>
              <span className="block truncate text-[11px] text-[var(--ink-2)]">
                {card.bank}
                {card.last4 ? ` ···${card.last4}` : ""}
              </span>
            </span>
            {canEdit ? (
              <button
                type="button"
                className="shrink-0 text-[11px] font-semibold text-[var(--ink-3)]"
                onClick={() => setCards((prev) => prev.filter((c) => c.id !== card.id))}
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label={labels.name}>
              <input className="ui-input" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label={labels.bank}>
              <input className="ui-input" value={bank} onChange={(e) => setBank(e.target.value)} />
            </FormField>
            <FormField label={labels.logoUrl}>
              <input className="ui-input" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="/payment-cards/..." />
            </FormField>
            <FormField label={labels.last4}>
              <input className="ui-input" value={last4} onChange={(e) => setLast4(e.target.value)} inputMode="numeric" maxLength={4} />
            </FormField>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ui-btn-secondary min-h-[36px] px-3 text-[13px]" onClick={addCard}>
              {labels.add}
            </button>
            <button
              type="button"
              className="ui-btn-primary min-h-[36px] px-4 text-[13px]"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? labels.sending : labels.save}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );

}
