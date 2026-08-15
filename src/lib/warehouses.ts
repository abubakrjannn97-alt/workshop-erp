import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getRawWarehouse = cache(async () => {
  const wh = await prisma.warehouse.findUnique({ where: { code: "RAW" } });
  if (!wh) throw new Error("Warehouse RAW is missing — run db:seed");
  return wh;
});

export const getFgWarehouse = cache(async () => {
  const wh = await prisma.warehouse.findUnique({ where: { code: "FG" } });
  if (!wh) throw new Error("Warehouse FG is missing — run db:seed");
  return wh;
});
