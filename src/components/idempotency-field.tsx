"use client";

import { useId } from "react";

/** Prefer explicit `value` from parent; fall back to stable React id for SSR. */
export function IdempotencyField({ prefix, value }: { prefix: string; value?: string }) {
  const reactId = useId().replace(/:/g, "");
  return <input type="hidden" name="idempotencyKey" value={value ?? `${prefix}-${reactId}`} />;
}
