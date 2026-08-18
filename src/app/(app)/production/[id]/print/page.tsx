import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { PrintFrame } from "@/components/print-frame";
import { getTranslator } from "@/lib/locale";
import { intlLocale } from "@/lib/i18n";

export default async function ProductionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getTranslator();
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
  const dl = intlLocale(locale);

  return (
    <PrintFrame
      title={t("print.jobTitle", { n: job.order.number })}
      subtitle={`${job.order.customer.name}${job.dueAt ? ` · ${t("prod.due")} ${job.dueAt.toLocaleDateString(dl)}` : ""}`}
    >
      {item ? (
        <p>
          {item.product.name}: {qtyDisplay(item.quantity)} {item.product.saleUnit.symbol} →{" "}
          {qtyDisplay(item.outputQty)} {item.product.outputUnit.symbol}
        </p>
      ) : null}
      <p>{t("print.progress", { a: qtyDisplay(job.producedQty), b: qtyDisplay(job.plannedQty) })}</p>
      <h2 className="mt-3 font-semibold">{t("print.needSnap")}</h2>
      <ul>
        {job.order.materials.map((n) => (
          <li key={n.id}>
            {n.material.name}: {qtyDisplay(n.plannedQty)} {n.material.storageUnit.symbol}
          </li>
        ))}
      </ul>
      {job.batches.length > 0 ? (
        <>
          <h2 className="mt-3 font-semibold">{t("print.batches")}</h2>
          <ul>
            {job.batches.map((b) => (
              <li key={b.id}>
                {t("print.batchLine", {
                  n: b.number,
                  plan: qtyDisplay(b.plannedQty),
                  fact: qtyDisplay(b.actualQty),
                  scrap: qtyDisplay(b.scrapQty),
                })}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </PrintFrame>
  );
}
