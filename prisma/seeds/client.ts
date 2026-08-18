import { PrismaClient } from "@prisma/client";

export function createSeedClient() {
  return new PrismaClient({
    transactionOptions: {
      maxWait: 15_000,
      timeout: 30_000,
    },
  });
}
