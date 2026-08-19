import { spawnSync } from "node:child_process";

function run(label, cmd, args, extraEnv = {}) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("Migrate", "npx", ["prisma", "migrate", "deploy"]);
run("Seed production baseline", "npx", ["tsx", "prisma/seed.ts"], { SEED_DEMO: "0" });
