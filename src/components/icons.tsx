import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, className, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
    ...rest,
  };
}

export function IconHome(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
export function IconBox(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
      <path d="M12 12v9M3 7.5 12 12l9-4.5" />
    </svg>
  );
}
export function IconCart(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L21 8H7" />
    </svg>
  );
}
export function IconUsers(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M2 19c0-3 3-5 7-5s7 2 7 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M22 19c0-2.2-1.8-3.8-4-4.5" />
    </svg>
  );
}
export function IconClipboard(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4.5h6V3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1.5Z" />
      <path d="M9 10h6M9 14h6" />
    </svg>
  );
}
export function IconFactory(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 21V10l6 4V10l6 4V5h6v16H3Z" />
    </svg>
  );
}
export function IconWarehouse(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 10 12 3l9 7v11H3V10Z" />
      <path d="M9 21v-7h6v7" />
    </svg>
  );
}
export function IconTruck(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7V10Z" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17.5" cy="18" r="1.5" />
    </svg>
  );
}
export function IconWallet(p: IconProps) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1.2" />
    </svg>
  );
}
export function IconUser(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.8-3.2 4-4.5 7-4.5s5.2 1.3 7 4.5" />
    </svg>
  );
}
export function IconChart(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16V10M12 16V7M16 16v-4" />
    </svg>
  );
}
export function IconSettings(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 0 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1Z" />
    </svg>
  );
}
export function IconHelp(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.2.8-1.2 1.6V14" />
      <circle cx="12" cy="17" r="0.7" fill="currentColor" />
    </svg>
  );
}
export function IconBell(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M6 9a6 6 0 0 1 12 0c0 7 2 7 2 9H4c0-2 2-2 2-9Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
export function IconMenu(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
export function IconChevron(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M15 18 9 12l6-6" />
    </svg>
  );
}
export function IconChevronRight(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
/** @deprecated use IconChevron */
export const IconPanel = IconChevron;
/** @deprecated use IconChevronRight */
export const IconPanelRight = IconChevronRight;
export function IconSearch(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
export function IconTrend(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M3 17 10 10l4 4 7-7" />
      <path d="M14 7h7v7" />
    </svg>
  );
}
export function IconArrowDown(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M12 3v14" />
      <path d="m7 13 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
export function IconAlert(p: IconProps) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16.2" r="0.7" fill="currentColor" />
    </svg>
  );
}
export function IconReceipt(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M7 3h10v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4V3Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}
export function IconLogout(p: IconProps) {
  return (
    <svg {...base(p)}>
      <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
      <path d="M16 12H8M16 12l-3-3M16 12l-3 3" />
    </svg>
  );
}
