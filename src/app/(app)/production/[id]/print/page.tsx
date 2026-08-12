import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { qtyDisplay } from "@/lib/decimal";
import { PrintFrame } from "@/components/print-frame";

export default async function ProductionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("production.view");
  const { id } = await params;
  const job = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: true,
          items: { include: { product: { include: { saleUnit: true, outputUnit: true } } } },
          materials: { include: { material: { include: { storageUnit: true } } } },
        },
      },
      batches: { include: { materials: { include: { material: true } }, scraps: true } },
    },
  });
  if (!job) notFound();
  const item = job.order.items[0];

  return (
    <PrintFrame
      title={`Производственное задание · заказ #${job.order.number}`}
      subtitle={`${job.order.customer.name}${job.dueAt ? ` · срок ${job.dueAt.toLocaleDateString("ru-RU")}` : ""}`}
    >
      {item ? (
        <p>
          {item.product.name}: {qtyDisplay(item.quantity)} {item.product.saleUnit.symbol} →{" "}
          {qtyDisplay(item.outputQty)} {item.product.outputUnit.symbol}
        </p>
      ) : null}
      <p>
        Прогресс: {qtyDisplay(job.producedQty)} / {qtyDisplay(job.plannedQty)}
      </p>
      <h2 className="mt-3 font-semibold">Необходимо (snapshot)</h2>
      <ul>
        {job.order.materials.map((n) => (
          <li key={n.id}>
            {n.material.name}: {qtyDisplay(n.plannedQty)} {n.material.storageUnit.symbol}
          </li>
        ))}
      </ul>
      {job.batches.length > 0 ? (
        <>
          <h2 className="mt-3 font-semibold">Партии</h2>
          <ul>
            {job.batches.map((b) => (
              <li key={b.id}>
                №{b.number}: план {qtyDisplay(b.plannedQty)}, факт {qtyDisplay(b.actualQty)}, брак{" "}
                {qtyDisplay(b.scrapQty)}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </PrintFrame>
  );
}
