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
    <div className="flex flex-wrap gap-1.5 text-[13px]">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={`rounded-[var(--radius-sm)] px-2.5 py-1 ${
            current === item.id
              ? "bg-[var(--titan-dark)] text-white"
              : "border border-[var(--line)] bg-[var(--surface)] text-[var(--text-secondary)]"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
