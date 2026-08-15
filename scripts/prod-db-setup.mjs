import { spawnSync } from "node:child_process";

function run(label, cmd, args) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("Migrate", "npx", ["prisma", "migrate", "deploy"]);
run("Seed demo history", "npx", ["tsx", "prisma/seed-demo.ts"]);
