import Link from "next/link";

const ITEMS = [
  { href: "/sales", id: "sales", label: "Продажи" },
  { href: "/crm", id: "crm", label: "CRM" },
  { href: "/orders", id: "orders", label: "Заказы" },
] as const;

export function SalesNav({ current }: { current: "sales" | "crm" | "orders" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-[var(--radius-sm)] px-2.5 py-1 text-[13px] ${
            current === item.id
              ? "bg-[var(--titan-dark)] text-white"
              : "border border-[var(--line)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
