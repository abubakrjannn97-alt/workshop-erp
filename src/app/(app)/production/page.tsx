import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { qtyDisplay } from "@/lib/decimal";

const STATUS: Record<string, string> = {
  OPEN: "Открыт",
  IN_PROGRESS: "В работе",
  DONE: "Готово",
};

export default async function ProductionPage() {
  const session = await requirePermission("production.view");
  const jobs = await prisma.productionOrder.findMany({
    where:
      session.user.roleCode === "worker"
        ? { batches: { some: { responsibleUserId: session.user.id } } }
        : undefined,
    include: {
      order: { include: { customer: true, items: { include: { product: true } } } },
      batches: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
<h1 className="mt-1 text-2xl font-semibold">Производство</h1>
        <p className="mt-1 text-sm text-slate-600">
          Задание создаётся при подтверждении заказа. Партии, факт сырья, брак и выпуск на склад ГП.
        </p>
      </div>
      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">Заказ</th>
              <th className="px-4 py-2">Изделие</th>
              <th className="px-4 py-2">Прогресс</th>
              <th className="px-4 py-2">Брак</th>
              <th className="px-4 py-2">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-slate-500">
                  Подтвердите заказ — задание появится здесь.
                </td>
              </tr>
            ) : (
              jobs.map((job) => {
                const product = job.order.items[0]?.product.name ?? "—";
                return (
                  <tr key={job.id}>
                    <td className="px-4 py-2">
                      <Link href={`/production/${job.id}`} className="font-medium text-[var(--titan-dark)] hover:underline">
                        #{job.order.number}
                      </Link>
                      <p className="text-xs text-slate-500">{job.order.customer.name}</p>
                    </td>
                    <td className="px-4 py-2">{product}</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {qtyDisplay(job.producedQty)} / {qtyDisplay(job.plannedQty)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{qtyDisplay(job.scrapQty)}</td>
                    <td className="px-4 py-2">{STATUS[job.status] ?? job.status}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
