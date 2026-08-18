import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDomainConfig } from "@/lib/domain-config";

type WarehouseClient = Pick<typeof prisma, "warehouse"> | Prisma.TransactionClient;

export const resolveRawWarehouseCode = cache(async (): Promise<string> => {
  const config = await getDomainConfig();
  return config.warehouses.rawCode;
});

export const resolveFinishedGoodsWarehouseCode = cache(async (): Promise<string> => {
  const config = await getDomainConfig();
  return config.warehouses.fgCode;
});

async function findWarehouseByCode(client: WarehouseClient, code: string) {
  return client.warehouse.findUnique({ where: { code } });
}

export const getRawWarehouse = cache(async () => {
  const code = await resolveRawWarehouseCode();
  const wh = await findWarehouseByCode(prisma, code);
  if (!wh) throw new Error(`Warehouse ${code} is missing — run db:seed`);
  return wh;
});

export const getFgWarehouse = cache(async () => {
  const code = await resolveFinishedGoodsWarehouseCode();
  const wh = await findWarehouseByCode(prisma, code);
  if (!wh) throw new Error(`Warehouse ${code} is missing — run db:seed`);
  return wh;
});

export async function findRawWarehouse(client: WarehouseClient = prisma) {
  const code = await resolveRawWarehouseCode();
  return findWarehouseByCode(client, code);
}

export async function findFinishedGoodsWarehouse(client: WarehouseClient = prisma) {
  const code = await resolveFinishedGoodsWarehouseCode();
  return findWarehouseByCode(client, code);
}
