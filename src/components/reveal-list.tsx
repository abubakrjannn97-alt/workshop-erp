"use client";

import { Children, useState, type ReactNode } from "react";

const BTN =
  "inline-flex h-7 items-center rounded-lg border border-[#E5E7EB] bg-white px-2.5 text-[11px] font-semibold text-[#667085] transition-colors hover:border-[#D4AF37]/40 hover:text-[#101828]";

export function RevealList({
  children,
  moreLabel,
  lessLabel,
  limit = 5,
  className,
  as = "ul",
  showCount = true,
}: {
  children: ReactNode;
  moreLabel: string;
  lessLabel: string;
  limit?: number;
  className?: string;
  as?: "ul" | "tbody" | "div";
  showCount?: boolean;
}) {
  const items = Children.toArray(children);
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, limit);
  const hidden = Math.max(0, items.length - limit);
  const toggle = (
    <button type="button" onClick={() => setOpen((v) => !v)} className={BTN}>
      {open ? lessLabel : showCount && hidden > 0 ? `${moreLabel} (${hidden})` : moreLabel}
    </button>
  );

  if (as === "tbody") {
    return (
      <tbody className={className}>
        {shown}
        {hidden > 0 ? (
          <tr>
            <td colSpan={20} className="!border-0 !bg-transparent pt-2">
              {toggle}
            </td>
          </tr>
        ) : null}
      </tbody>
    );
  }

  const Tag = as;
  return (
    <div>
      <Tag className={className ?? (as === "ul" ? "ui-list" : undefined)}>{shown}</Tag>
      {hidden > 0 ? <div className="px-3 pb-2 pt-1">{toggle}</div> : null}
    </div>
  );
}
