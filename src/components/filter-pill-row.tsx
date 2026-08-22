import Link from "next/link";
import styles from "./filter-pill-row.module.css";

export type FilterPillItem = {
  href: string;
  label: string;
  active?: boolean;
};

export function FilterPillRow({
  items,
  className = "",
  scroll = false,
  compact = false,
  tour,
  "aria-label": ariaLabel,
}: {
  items: FilterPillItem[];
  className?: string;
  scroll?: boolean;
  compact?: boolean;
  tour?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      className={`${styles.block} ${scroll ? styles.scroll : ""} ${compact ? styles.compact : ""} ${className}`.trim()}
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
          className={item.active ? styles.pillActive : styles.pill}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
