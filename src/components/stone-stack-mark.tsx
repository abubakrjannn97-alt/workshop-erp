export function StoneStackMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <ellipse cx="16" cy="24.5" rx="9" ry="3.5" fill="#C4A962" opacity="0.35" />
      <path
        d="M8 22.5C8 19.5 10.2 17.5 12.5 17.5C13.4 15.2 15.2 14 16 14C16.8 14 18.6 15.2 19.5 17.5C21.8 17.5 24 19.5 24 22.5"
        fill="#B8954A"
      />
      <path
        d="M10.5 18C10.5 16 12 14.8 13.2 14.8C13.8 13.2 14.8 12.5 15.5 12.5C16.2 12.5 17.2 13.2 17.8 14.8C19 14.8 20.5 16 20.5 18"
        fill="#D4BC7A"
      />
      <ellipse cx="15.5" cy="11.8" rx="3.2" ry="2.2" fill="#E8D5A8" />
    </svg>
  );
}
