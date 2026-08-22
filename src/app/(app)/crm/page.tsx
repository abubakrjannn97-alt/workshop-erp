import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { D, money } from "@core/shared/decimal";
import { getCustomerPipelineStatusMap } from "@core/crm/customer-pipeline";
import { CrmClientsView } from "./crm-clients-view";

export default async function CrmPage() {
  const { locale } = await getTranslator();
  const session = await requirePermission("crm.view");
  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "crm.manage");
  const own = session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {};

  const customers = await prisma.customer.findMany({
    where: { archivedAt: null, ...own },
    include: { orders: true, manager: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const statusMap = await getCustomerPipelineStatusMap(customers.map((c) => c.id));

  const rows = customers.map((c) => {
    const turnover = c.orders.reduce((s, o) => s.add(String(o.total)), D(0));
    const debt = c.orders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
    const pipelineStatus = statusMap.get(c.id) ?? "NEW";
    return {
      id: c.id,
      name: c.name,
      phone: c.phone ?? c.whatsapp,
      managerName: c.manager?.name ?? null,
      turnover: money(turnover),
      debt: money(debt),
      pipelineStatus,
    };
  });

  return <CrmClientsView locale={locale} canManage={canManage} customers={rows} />;
}
