import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission, usesWorkerMobileExperience } from "@core/rbac/permissions";
import { requireSession } from "@core/auth/authz";
import { DesktopHome } from "@/components/dashboards/desktop-home";
import { OwnerHome } from "@/components/dashboards/owner-home";
import { MobileOwnerHome } from "@/components/dashboards/mobile-owner-home";
import { SalesHome } from "@/components/dashboards/sales-home";
import { WarehouseHome } from "@/components/dashboards/warehouse-home";
import { AccountantHome } from "@/components/dashboards/accountant-home";
import { ProductionHome } from "@/components/dashboards/production-home";

function isMobileUserAgent(ua: string) {
  return /Mobile|Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

function MobileRoleHome({
  role,
  perms,
  financePeriod,
}: {
  role: string;
  perms: string[];
  financePeriod?: string;
}) {
  if (role === "sales_manager") return <SalesHome />;
  if (role === "warehouse_manager") return <WarehouseHome />;
  if (role === "accountant") return <AccountantHome />;
  if (role === "production_manager") return <ProductionHome />;
  if (role === "owner" || role === "director") return <MobileOwnerHome />;
  if (role === "employee") {
    if (hasPermission(perms, role, "finance.view")) {
      return <MobileOwnerHome />;
    }
    if (hasPermission(perms, role, "crm.view") || hasPermission(perms, role, "orders.view")) {
      return <SalesHome />;
    }
    if (hasPermission(perms, role, "inventory.view")) return <WarehouseHome />;
    if (hasPermission(perms, role, "production.manage") || hasPermission(perms, role, "production.view")) {
      return <ProductionHome />;
    }
  }
  if (hasPermission(perms, role, "finance.view")) return <MobileOwnerHome />;
  if (hasPermission(perms, role, "crm.view")) return <SalesHome />;
  if (hasPermission(perms, role, "inventory.view")) return <WarehouseHome />;
  if (hasPermission(perms, role, "production.view")) return <ProductionHome />;
  return <OwnerHome />;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ fp?: string }>;
}) {
  const session = await requireSession();
  const role = session.user.roleCode;
  const perms = session.user.permissions;
  const { fp } = await searchParams;
  const ua = (await headers()).get("user-agent") ?? "";

  if (role === "worker" || (usesWorkerMobileExperience(role, perms) && isMobileUserAgent(ua))) {
    redirect("/me");
  }

  return (
    <>
      <div className="hidden lg:block">
        <DesktopHome />
      </div>
      <div className="lg:hidden">
        <MobileRoleHome role={role} perms={perms} financePeriod={fp} />
      </div>
    </>
  );
}
