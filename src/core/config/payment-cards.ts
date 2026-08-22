import { SETTING_KEYS } from "@core/config/settings";
import { findSetting } from "@core/config/setting-store";

export type PaymentCard = {
  id: string;
  name: string;
  bank: string;
  logoUrl: string;
  last4?: string;
  isActive: boolean;
};

export const DEFAULT_PAYMENT_CARDS: PaymentCard[] = [
  {
    id: "alif",
    name: "Alif Mobi",
    bank: "Alif Bank",
    logoUrl: "/payment-cards/alif.png",
    last4: "4242",
    isActive: true,
  },
  {
    id: "dc",
    name: "DC Wallet",
    bank: "DC Bank",
    logoUrl: "/payment-cards/dc.svg",
    last4: "8888",
    isActive: true,
  },
  {
    id: "eskhata",
    name: "Эсхата Онлайн",
    bank: "Эсхата",
    logoUrl: "/payment-cards/eskhata.svg",
    last4: "7777",
    isActive: true,
  },
];

function parseCards(raw: unknown): PaymentCard[] | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    const parsed = raw as PaymentCard[];
    if (parsed.length === 0) return null;
    return parsed.filter((c) => c.id && c.name && c.logoUrl);
  }
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as PaymentCard[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter((c) => c.id && c.name && c.logoUrl);
  } catch {
    return null;
  }
}

export async function loadPaymentCards(): Promise<PaymentCard[]> {
  const row = await findSetting(SETTING_KEYS.paymentCards);
  return parseCards(row?.value) ?? DEFAULT_PAYMENT_CARDS.filter((c) => c.isActive);
}

export function serializePaymentCards(cards: PaymentCard[]): string {
  return JSON.stringify(cards);
}
