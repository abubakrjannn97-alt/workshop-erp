/**
 * Validate ERP readiness for a real workshop after production bootstrap.
 *
 * Usage: npx tsx scripts/validate-workshop-setup.ts
 * ENV: DATABASE_URL (required), WORKSHOP_DOMAIN (optional, default facade)
 */
import { loadLocalEnvFiles } from "./load-env";
import { createSeedClient } from "../prisma/seeds/client";
import { runWorkshopSetupChecks, summarizeWorkshopChecks } from "./workshop-setup-checks";

loadLocalEnvFiles();

async function main() {
  const prisma = createSeedClient();

  console.log(
    `\n→ Workshop setup validation (WORKSHOP_DOMAIN=${process.env.WORKSHOP_DOMAIN ?? "default"})...\n`,
  );

  const checks = await runWorkshopSetupChecks(prisma);

  for (const c of checks) {
    if (c.pass) console.log(`✓ ${c.name}: ${c.detail}`);
    else console.error(`✗ ${c.name}: ${c.detail}`);
  }

  const { passed, failed } = summarizeWorkshopChecks(checks);

  console.log("\n" + "=".repeat(50));
  console.log(`WORKSHOP SETUP: ${passed} PASS / ${failed} FAIL`);

  await prisma.$disconnect();

  if (failed > 0) {
    console.error("\nFAILED CHECKS:");
    for (const c of checks.filter((ch) => !ch.pass)) {
      console.error(`  ✗ ${c.name}: ${c.detail}`);
    }
    process.exit(1);
  }

  console.log("\nWORKSHOP SETUP PASS");
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
