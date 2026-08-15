import { headers } from "next/headers";
import { hasPermission } from "@/lib/permissions";
import { requireSession } from "@/lib/authz";
import { DesktopHome } from "@/components/dashboards/desktop-home";
import { OwnerHome } from "@/components/dashboards/owner-home";
import { MobileOwnerHome } from "@/components/dashboards/mobile-owner-home";
import { SalesHome } from "@/components/dashboards/sales-home";
import { WarehouseHome } from "@/components/dashboards/warehouse-home";
import { AccountantHome } from "@/components/dashboards/accountant-home";
import { ProductionHome } from "@/components/dashboards/production-home";
import { MobileWorkerGate } from "@/components/mobile-worker-gate";

function isMobileUserAgent(ua: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
}

function MobileRoleHome({ role, perms }: { role: string; perms: string[] }) {
  if (role === "sales_manager") return <SalesHome />;
  if (role === "warehouse_manager") return <WarehouseHome />;
  if (role === "accountant") return <AccountantHome />;
  if (role === "production_manager") return <ProductionHome />;
  if (role === "owner" || role === "director") return <MobileOwnerHome />;
  if (hasPermission(perms, role, "finance.view")) return <MobileOwnerHome />;
  if (hasPermission(perms, role, "crm.view")) return <SalesHome />;
  if (hasPermission(perms, role, "inventory.view")) return <WarehouseHome />;
  if (hasPermission(perms, role, "production.view")) return <ProductionHome />;
  return <OwnerHome />;
}

export default async function HomePage() {
  const session = await requireSession();
  const role = session.user.roleCode;
  const perms = session.user.permissions;
  const ua = (await headers()).get("user-agent") ?? "";
  const mobile = isMobileUserAgent(ua);

  if (mobile) {
    return (
      <>
        {role === "worker" ? <MobileWorkerGate /> : null}
        {role === "worker" ? null : <MobileRoleHome role={role} perms={perms} />}
      </>
    );
  }

  return (
    <>
      {role === "worker" ? <MobileWorkerGate /> : null}
      <DesktopHome />
    </>
  );
}
