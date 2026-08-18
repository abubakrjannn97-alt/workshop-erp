export function FundRow({
  label,
  amount,
  highlight,
}: {
  code?: string;
  label: string;
  amount: string;
  highlight?: boolean;
}) {
  return (
    <li className={`flex min-h-12 items-center gap-3 border-b border-[var(--line)] last:border-b-0 ${highlight ? "font-semibold" : ""}`}>
      <span className="min-w-0 flex-1 truncate text-[15px] leading-6 text-[var(--ink)]">{label}</span>
      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[var(--ink)]">{amount}</span>
    </li>
  );
}
