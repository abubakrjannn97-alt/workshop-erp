import { readFileSync, writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function counts() {
  return {
    orders: await prisma.order.count(),
    payments: await prisma.payment.count(),
    stock: await prisma.stockItem.count(),
    materials: await prisma.material.count(),
    ledger: await prisma.ledgerEntry.count(),
  };
}

async function main() {
  const mode = process.argv[2] ?? "before";
  if (mode === "before") {
    const before = await counts();
    writeFileSync("scripts/backup-verify-before.json", JSON.stringify(before, null, 2));
    await prisma.auditLog.create({
      data: { action: "backup.verify.marker", entityType: "system", entityId: "backup-test" },
    });
    console.log("BEFORE", before);
    console.log("MARKER_INSERTED");
  } else {
    const before = JSON.parse(readFileSync("scripts/backup-verify-before.json", "utf8"));
    const after = await counts();
    const marker = await prisma.auditLog.count({ where: { action: "backup.verify.marker" } });
    console.log("AFTER", after);
    console.log("MARKER_AFTER_RESTORE", marker);
    const ok = JSON.stringify(before) === JSON.stringify(after) && marker === 0;
    writeFileSync(
      "scripts/backup-verify-report.json",
      JSON.stringify({ ok, before, after, markerAfterRestore: marker, at: new Date().toISOString() }, null, 2),
    );
    console.log(ok ? "RESTORE_OK" : "RESTORE_MISMATCH");
    if (!ok) process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
