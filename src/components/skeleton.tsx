import type { CSSProperties } from "react";

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`ui-skeleton ${className ?? ""}`}
      style={style}
      aria-hidden
    />
  );
}

export function LoadingState({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={`loading-state ${className ?? ""}`} role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden />
      {label ? <span>{label}</span> : null}
    </div>
  );
}
