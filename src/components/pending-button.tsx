"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} aria-busy={pending}>
      {pending ? "Сохранение…" : children}
    </button>
  );
}
