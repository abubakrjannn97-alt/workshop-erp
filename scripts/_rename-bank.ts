import { loadLocalEnvFiles } from "./load-env";
loadLocalEnvFiles();
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const row = await p.cashAccount.update({
    where: { code: "BANK" },
    data: { name: "Счёт карты" },
    select: { code: true, name: true },
  });
  console.log("updated", row);
}
main().finally(() => p.$disconnect());
