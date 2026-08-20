import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const users = await p.user.findMany({
    select: { email: true, isActive: true, archivedAt: true, role: { select: { code: true } } },
    orderBy: { email: "asc" },
  });
  const seedOpening = await p.stockMovement.count({ where: { idempotencyKey: { startsWith: "seed-opening-" } } });
  const e2eMoves = await p.stockMovement.count({
    where: { OR: [{ idempotencyKey: { startsWith: "E2E-" } }, { idempotencyKey: { startsWith: "P16-" } }, { idempotencyKey: { startsWith: "smoke-" } }] },
  });
  const e2eOrders = await p.order.count({
    where: { OR: [{ number: { gte: 900000 } }, { customer: { name: { contains: "SHIFT" } } }, { customer: { name: { contains: "E2E" } } }] },
  });
  const materials = await p.material.count({ where: { isActive: true } });
  const products = await p.product.count({ where: { archivedAt: null } });
  const receipts = await p.stockMovement.count({ where: { type: "RECEIPT" } });
  const migrations = await p.$queryRawUnsafe<{ c: bigint }[]>("SELECT count(*)::bigint as c FROM _prisma_migrations WHERE finished_at IS NOT NULL");
  console.log(JSON.stringify({ users, seedOpening, e2eMoves, e2eOrders, materials, products, receipts, migrations: Number(migrations[0]?.c ?? 0) }, null, 2));
}
main().finally(() => p.$disconnect());
