import Link from "next/link";

export type SegmentedItem = {
  href: string;
  label: string;
  active?: boolean;
};

export function Segmented({
  items,
  className = "",
  scroll = false,
  tour,
  "aria-label": ariaLabel,
}: {
  items: SegmentedItem[];
  className?: string;
  scroll?: boolean;
  tour?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={`ui-seg ${scroll ? "ui-seg-scroll no-scrollbar" : ""} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
      {...(tour ? { "data-tour": tour } : {})}
    >
      {items.map((item) => (
        <Link
          key={`${item.href}:${item.label}`}
          href={item.href}
          prefetch
          role="tab"
          aria-selected={Boolean(item.active)}
          className={item.active ? "ui-seg-item ui-seg-item-on ui-chip-on" : "ui-seg-item ui-chip"}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
