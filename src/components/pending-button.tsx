"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  className,
  pendingLabel = "…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
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
