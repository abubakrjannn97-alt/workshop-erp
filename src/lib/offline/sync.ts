import { closeBatch } from "@/core/production/close-batch-action";
import { idbDelete, idbGetAll, idbPut } from "@/lib/offline/db";
import { recordToFormData } from "@/lib/offline/form";
import type { OfflineActionType, QueuedAction } from "@/lib/offline/types";

type ActionResult = { ok?: boolean; error?: string; id?: string };

const handlers: Record<OfflineActionType, (formData: FormData) => Promise<ActionResult>> = {
  "production.closeBatch": closeBatch,
};

export async function getPendingCount(): Promise<number> {
  const items = await idbGetAll<QueuedAction>("queue");
  return items.length;
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const items = await idbGetAll<QueuedAction>("queue");
  return items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function enqueueAction(
  action: Pick<QueuedAction, "id" | "type" | "payload" | "label">,
): Promise<void> {
  const item: QueuedAction = {
    ...action,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  await idbPut("queue", item.id, item);
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const items = await getPendingActions();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    const handler = handlers[item.type];
    if (!handler) {
      await idbDelete("queue", item.id);
      failed++;
      continue;
    }

    try {
      const result = await handler(recordToFormData(item.payload));
      if (result.error) {
        await idbPut("queue", item.id, {
          ...item,
          retries: item.retries + 1,
          lastError: result.error,
        });
        failed++;
        continue;
      }
      await idbDelete("queue", item.id);
      synced++;
    } catch (error) {
      await idbPut("queue", item.id, {
        ...item,
        retries: item.retries + 1,
        lastError: error instanceof Error ? error.message : String(error),
      });
      failed++;
    }
  }

  return { synced, failed };
}
