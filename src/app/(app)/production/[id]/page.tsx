import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { closeBatch, createBatch } from "@/app/actions/production";
import { PendingButton } from "@/components/pending-button";

export default async function ProductionJobPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("production.view");
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
      batches: {
        include: {
          materials: { include: { material: { include: { storageUnit: true } } } },
          scraps: true,
        },
        orderBy: { number: "asc" },
      },
    },
  });
  if (!job) notFound();

  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "production.manage");
  const canReport = hasPermission(session.user.permissions, session.user.roleCode, "production.report");
  const workers = await prisma.user.findMany({
    where: { archivedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const remaining = D(String(job.plannedQty)).sub(
    job.batches.reduce((s, b) => s.add(String(b.plannedQty)), D(0)),
  );
  const product = job.order.items[0];

  async function addBatch(formData: FormData) {
    "use server";
    await createBatch(formData);
  }
  async function finish(formData: FormData) {
    "use server";
    await closeBatch(formData);
  }

  return (
    <div className="space-y-6">
      <div>
<h1 className="mt-1 text-2xl font-semibold">Заказ #{job.order.number}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {job.order.customer.name}
          {product ? ` · ${product.product.name} ${qtyDisplay(product.quantity)} ${product.product.saleUnit.symbol}` : null}
          {job.dueAt ? ` · срок ${job.dueAt.toLocaleDateString("ru-RU")}` : null}
        </p>
        <p className="mt-1 text-sm font-medium">
          Прогресс: {qtyDisplay(job.producedQty)} / {qtyDisplay(job.plannedQty)}
          {product ? ` ${product.product.saleUnit.symbol}` : ""}
        </p>
        <Link href={`/production/${job.id}/print`} className="mt-2 inline-block text-sm text-[var(--titan-dark)] hover:underline">
          Печать задания / PDF
        </Link>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">План сырья на заказ</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {job.order.materials.map((need) => (
            <li key={need.id}>
              {need.material.name}: {qtyDisplay(need.plannedQty)} {need.material.storageUnit.symbol}
            </li>
          ))}
        </ul>
      </section>

      {canManage && remaining.gt(0) && job.status !== "DONE" ? (
        <form action={addBatch} className="max-w-xl space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-sm font-semibold">Новая партия</h2>
          <input type="hidden" name="productionOrderId" value={job.id} />
          <label className="block text-sm">
            План, {product?.product.saleUnit.symbol ?? "ед."} (остаток {qtyDisplay(remaining)})
            <input
              name="plannedQty"
              defaultValue={qtyDisplay(remaining)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            Ответственный
            <select name="responsibleUserId" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">—</option>
              {workers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <input name="comment" placeholder="Комментарий" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-[var(--titan-dark)] px-3 py-2 text-sm text-white">Создать партию</button>
        </form>
      ) : null}

      {job.batches.map((batch) => {
        const scrapPct =
          D(String(batch.actualQty)).add(batch.scrapQty).gt(0)
            ? D(String(batch.scrapQty)).div(D(String(batch.actualQty)).add(batch.scrapQty)).mul(100)
            : D(0);
        return (
          <section key={batch.id} className="rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="text-sm font-semibold">
              Партия №{batch.number} · {batch.status === "CLOSED" ? "закрыта" : "открыта"} · план{" "}
              {qtyDisplay(batch.plannedQty)}
            </h2>
            {batch.status === "CLOSED" ? (
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  Годных: {qtyDisplay(batch.actualQty)}, брак: {qtyDisplay(batch.scrapQty)} ({qtyDisplay(scrapPct)}%)
                </p>
                <ul className="space-y-1">
                  {batch.materials.map((line) => {
                    const plan = D(String(line.plannedQty));
                    const fact = D(String(line.actualQty));
                    const over = plan.gt(0) ? fact.sub(plan).div(plan).mul(100) : D(0);
                    return (
                      <li key={line.id}>
                        {line.material.name}: план {qtyDisplay(plan)} {line.material.storageUnit.symbol}, факт{" "}
                        {qtyDisplay(fact)}
                        {over.gte(5) ? (
                          <span className="ml-2 text-amber-800">
                            расход выше нормы на {qtyDisplay(over)}%
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {batch.scraps.map((s) => (
                  <p key={s.id} className="text-xs text-slate-500">
                    Брак: {qtyDisplay(s.quantity)} · {s.reason}
                    {s.materialCost ? ` · ${moneyDisplay(s.materialCost)} с` : ""}
                  </p>
                ))}
              </div>
            ) : canReport ? (
              <form action={finish} className="mt-3 space-y-2">
                <input type="hidden" name="batchId" value={batch.id} />
                <label className="block text-sm">
                  Фактически произведено (годных)
                  <input
                    name="actualQty"
                    defaultValue={qtyDisplay(batch.plannedQty)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Брак
                  <input name="scrapQty" defaultValue="0" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
                <input name="scrapReason" placeholder="Причина брака" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <input name="photoUrl" placeholder="Фото брака (URL)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                {batch.materials.map((line) => (
                  <label key={line.id} className="block text-sm">
                    {line.material.name}, факт ({line.material.storageUnit.symbol}), план {qtyDisplay(line.plannedQty)}
                    <input
                      name={`actual-${line.materialId}`}
                      defaultValue={qtyDisplay(line.plannedQty)}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                ))}
                <textarea name="comment" placeholder="Комментарий" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                <PendingButton className="rounded-lg bg-[var(--titan-dark)] px-3 py-2 text-sm text-white">
                  Закрыть партию (выдача сырья + ГП)
                </PendingButton>
              </form>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Ожидает факт от производства.</p>
            )}
          </section>
        );
      })}

      <p className="text-sm">
        <Link href={`/orders/${job.orderId}`} className="text-[var(--titan-dark)] hover:underline">
          Открыть заказ
        </Link>
      </p>
    </div>
  );
}
