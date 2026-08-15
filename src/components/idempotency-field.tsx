"use client";

import { useId, useState } from "react";

export function IdempotencyField({ prefix }: { prefix: string }) {
  const reactId = useId();
  const [key] = useState(() => {
    const rand = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    return `${prefix}-${rand}`;
  });
  return <input type="hidden" name="idempotencyKey" value={key || `${prefix}-${reactId}`} />;
}
