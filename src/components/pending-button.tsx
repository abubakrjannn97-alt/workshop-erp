"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  className,
  pendingLabel = "…",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled || pending);
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={className}
      aria-busy={pending || undefined}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="loading-spinner" aria-hidden />
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
