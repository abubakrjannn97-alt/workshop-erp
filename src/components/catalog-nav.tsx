import Link from "next/link";

export function CatalogNav({ current }: { current: "products" | "materials" }) {
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <Link
        href="/products"
        className={`rounded-full px-3 py-1 ${current === "products" ? "bg-teal-800 text-white" : "bg-white ring-1 ring-slate-200"}`}
      >
        Продукция
      </Link>
      <Link
        href="/materials"
        className={`rounded-full px-3 py-1 ${current === "materials" ? "bg-teal-800 text-white" : "bg-white ring-1 ring-slate-200"}`}
      >
        Сырьё
      </Link>
    </div>
  );
}
