import { loadLocalEnvFiles } from "./load-env";
loadLocalEnvFiles();
import { PrismaClient } from "@prisma/client";
import { DEMO_PASSWORD } from "../src/core/auth/demo-users";
const p = new PrismaClient();
async function main() {
  const demoActive = await p.user.count({
    where: {
      isActive: true,
      email: {
        in: [
          "director@workshop.local",
          "sales@workshop.local",
          "production@workshop.local",
          "worker@workshop.local",
          "warehouse@workshop.local",
          "accountant@workshop.local",
        ],
      },
    },
  });
  const ops = await p.user.count({ where: { isActive: true, email: { endsWith: ".ops@workshop.local" } } });
  const owner = await p.user.findFirst({ where: { email: "owner@workshop.local" }, select: { isActive: true } });
  const e2eMoves = await p.stockMovement.count({
    where: {
      OR: [
        { idempotencyKey: { startsWith: "E2E-" } },
        { idempotencyKey: { startsWith: "P16-" } },
        { idempotencyKey: { startsWith: "smoke-" } },
      ],
    },
  });
  const seedOpening = await p.stockMovement.count({ where: { idempotencyKey: { startsWith: "seed-opening-" } } });
  const op = process.env.OWNER_PASSWORD ?? "";
  console.log(
    JSON.stringify({
      ownerActive: Boolean(owner?.isActive),
      demoRoleActive: demoActive,
      opsActive: ops,
      ownerPassIsDemo: op === DEMO_PASSWORD || op === "ChangeMeNow!",
      seedDemo: process.env.SEED_DEMO,
      bypass: process.env.AUTH_BYPASS,
      offsiteSet: Boolean(process.env.BACKUP_OFFSITE_CMD),
      e2eMoves,
      seedOpening,
    }),
  );
}
main().finally(() => p.$disconnect());
