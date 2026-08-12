import Link from "next/link";

export function CatalogNav({ current }: { current: "products" | "materials" }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[13px]">
      <Link
        href="/products"
        className={`rounded-[var(--radius-sm)] px-2.5 py-1 ${
          current === "products"
            ? "bg-[var(--titan-dark)] text-white"
            : "border border-[var(--line)] bg-[var(--surface)] text-[var(--text-secondary)]"
        }`}
      >
        Продукция
      </Link>
      <Link
        href="/materials"
        className={`rounded-[var(--radius-sm)] px-2.5 py-1 ${
          current === "materials"
            ? "bg-[var(--titan-dark)] text-white"
            : "border border-[var(--line)] bg-[var(--surface)] text-[var(--text-secondary)]"
        }`}
      >
        Сырьё
      </Link>
    </div>
  );
}
