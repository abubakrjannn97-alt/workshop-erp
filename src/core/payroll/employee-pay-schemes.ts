import { prisma } from "@core/infrastructure/prisma";
import { resolveActiveWorkshopId } from "@core/workshop/workshop-context";

/** Pay scheme codes editable on the employees page. */
export const EMPLOYEE_PAY_SCHEME_CODES = ["sales_commission", "production_piece"] as const;

const EMPLOYEE_SCHEME_ORDER = new Map(EMPLOYEE_PAY_SCHEME_CODES.map((code, index) => [code, index]));

export async function listWorkshopPaySchemes(userId: string, roleCode: string) {
  const workshopId = await resolveActiveWorkshopId(userId, roleCode);
  return prisma.payScheme.findMany({
    where: { workshopId },
    include: { tiers: { orderBy: { fromCount: "asc" } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export function employeePaySchemeSections<T extends { code: string; productionRate: unknown }>(schemes: T[]) {
  return schemes
    .filter(
      (scheme) =>
        (EMPLOYEE_PAY_SCHEME_CODES as readonly string[]).includes(scheme.code) && scheme.productionRate == null,
    )
    .sort(
      (a, b) =>
        (EMPLOYEE_SCHEME_ORDER.get(a.code as (typeof EMPLOYEE_PAY_SCHEME_CODES)[number]) ?? 99) -
        (EMPLOYEE_SCHEME_ORDER.get(b.code as (typeof EMPLOYEE_PAY_SCHEME_CODES)[number]) ?? 99),
    );
}

export function employeePaySchemeOptions<T extends { id: string; code: string; name: string; kind: string; productionRate: unknown }>(
  schemes: T[],
  commissionLabel: string,
) {
  return employeePaySchemeSections(schemes).map((scheme) => ({
    value: scheme.id,
    label: scheme.kind === "SALES_COMMISSION" ? commissionLabel : scheme.name,
  }));
}
