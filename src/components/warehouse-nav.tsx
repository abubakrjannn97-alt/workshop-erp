import Link from "next/link";

export function WarehouseNav({
  current,
}: {
  current: "raw" | "fg" | "moves" | "inventory";
}) {
  const items = [
    { href: "/warehouse", id: "raw", label: "Сырьё" },
    { href: "/warehouse/finished", id: "fg", label: "Готовая продукция" },
    { href: "/warehouse/movements", id: "moves", label: "Движения" },
    { href: "/warehouse/inventory", id: "inventory", label: "Инвентаризация" },
  ] as const;
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`rounded-full px-3 py-1 ${current === item.id ? "bg-teal-800 text-white" : "bg-white ring-1 ring-slate-200"}`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
