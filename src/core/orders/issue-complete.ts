import type { Prisma } from "@prisma/client";
import { writeOffProduct } from "@core/inventory/stock";
import { finishedGoodsIssueQty } from "@core/inventory/finished-goods";
import { ORDER_STATUS } from "@core/orders/orders";

type Tx = Prisma.TransactionClient;

type IssueItem = {
  productId: string;
  quantity: { toString(): string } | string;
};

export async function issueOrderStockAndMarkIssued(
  tx: Tx,
  input: {
    orderId: string;
    orderNumber: number;
    items: IssueItem[];
    warehouseId: string;
    userId: string;
  },
) {
  for (const item of input.items) {
    await writeOffProduct(
      {
        warehouseId: input.warehouseId,
        productId: item.productId,
        quantity: finishedGoodsIssueQty(item),
        userId: input.userId,
        reason: `Выдача заказа #${input.orderNumber}`,
        relatedType: "order",
        relatedId: input.orderId,
        idempotencyKey: `order-issue-${input.orderId}-${item.productId}`,
      },
      tx,
    );
  }
  const issued = await tx.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.ISSUED } });
  await tx.order.update({ where: { id: input.orderId }, data: { statusId: issued.id } });
}

export async function completeIssuedOrder(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: { status: true },
  });
  if (!order) throw new Error("Заказ не найден.");
  if (order.status.code !== ORDER_STATUS.ISSUED) {
    throw new Error("Завершать можно после выдачи клиенту.");
  }
  const completed = await tx.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.COMPLETED } });
  await tx.order.update({ where: { id: orderId }, data: { statusId: completed.id } });
}
