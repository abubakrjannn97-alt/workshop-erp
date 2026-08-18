import { DEFAULT_WORKSHOP_DOMAIN } from "@/domains/registry";

/** Active clone id from env. Safe for client bundles — no Prisma. */
export function getWorkshopDomain(): string {
  return process.env.WORKSHOP_DOMAIN?.trim() || DEFAULT_WORKSHOP_DOMAIN;
}
