import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const rows = await prisma.customer.findMany({ select: { name: true, phone: true }, orderBy: { createdAt: "asc" } });
console.log(JSON.stringify(rows, null, 2));
await prisma.$disconnect();
