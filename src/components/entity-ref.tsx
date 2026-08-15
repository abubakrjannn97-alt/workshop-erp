import Link from "next/link";
import type { ReactNode } from "react";

export function OrderRef({
  number,
  href,
  product,
}: {
  number?: number | string;
  href?: string;
  product?: string | null;
  label?: string;
}) {
  const text = product || (number != null ? String(number) : "");
  const title = <span className="font-semibold text-[var(--foreground)]">{text}</span>;
  return (
    <div className="min-w-0">
      {href ? (
        <Link href={href} className="hover:underline">
          {title}
        </Link>
      ) : (
        title
      )}
    </div>
  );
}

export function CustomerRef({
  name,
  href,
  manager,
}: {
  name: string;
  phone?: string | null;
  href?: string;
  manager?: string | null;
  phoneLabel?: string;
}) {
  const title = <span className="font-medium text-[var(--text)]">{name}</span>;
  return (
    <div className="min-w-0">
      <p className="truncate">
        {href ? (
          <Link href={href} className="hover:underline">
            {title}
          </Link>
        ) : (
          title
        )}
      </p>
      {manager ? <p className="truncate text-[12px] text-[var(--muted)]">{manager}</p> : null}
    </div>
  );
}

export function OrderCustomerLine({
  href,
  name,
  extra,
}: {
  number?: number | string;
  href: string;
  name: string;
  phone?: string | null;
  extra?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <CustomerRef name={name} href={href} />
      {extra}
    </div>
  );
}
