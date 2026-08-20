"use client";

import { useId } from "react";

/** Stable across SSR + hydration (unlike randomUUID / Date.now in useState). */
export function IdempotencyField({ prefix }: { prefix: string }) {
  const reactId = useId().replace(/:/g, "");
  return <input type="hidden" name="idempotencyKey" value={`${prefix}-${reactId}`} />;
}
