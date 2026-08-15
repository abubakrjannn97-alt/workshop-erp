export function WorkshopMark({
  size = 32,
  plain = false,
  color = "#F3B72F",
}: {
  size?: number;
  plain?: boolean;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      {plain ? null : <rect width="40" height="40" rx="10" fill="#111B2B" />}
      <path
        d="M10 26.5 14.5 14h3l2.2 7.2L22 14h3l4.5 12.5h-3.1l-.9-2.7h-5l-.9 2.7H10Zm5.4-5.2h3.7L17.25 16.4 15.4 21.3Z"
        fill={color}
      />
      <path d="M8 29h24" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
