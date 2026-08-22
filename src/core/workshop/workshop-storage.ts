import { AsyncLocalStorage } from "async_hooks";

const workshopStorage = new AsyncLocalStorage<{ workshopId: string }>();

export function getWorkshopIdFromContext(): string | undefined {
  return workshopStorage.getStore()?.workshopId;
}

export function runWithWorkshop<T>(workshopId: string, fn: () => T): T {
  return workshopStorage.run({ workshopId }, fn);
}

export function enterWorkshopContext(workshopId: string) {
  workshopStorage.enterWith({ workshopId });
}

export function patchWorkshopContext(workshopId: string) {
  const store = workshopStorage.getStore();
  if (store) {
    store.workshopId = workshopId;
    return true;
  }
  return false;
}
