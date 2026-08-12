import Link from "next/link";

const ITEMS = [
  { href: "/sales", label: "Продажи" },
  { href: "/crm", label: "CRM" },
  { href: "/orders", label: "Заказы" },
];

export function SalesNav({ current }: { current: "sales" | "crm" | "orders" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-full px-3 py-1 text-sm ${
            current === item.label.toLowerCase() ||
            (current === "sales" && item.href === "/sales") ||
            (current === "crm" && item.href === "/crm") ||
            (current === "orders" && item.href === "/orders")
              ? "bg-teal-800 text-white"
              : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
