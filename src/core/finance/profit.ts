import { D } from "@core/shared/decimal";

/** TZ §10: маржинальная vs чистая прибыль. */
export function contributionAndNet(input: {
  revenue: { toString(): string } | string;
  materialCost: { toString(): string } | string;
  labor: { toString(): string } | string;
  commission: { toString(): string } | string;
  fixedExpenses: { toString(): string } | string;
}) {
  const revenue = D(String(input.revenue));
  const materials = D(String(input.materialCost));
  const labor = D(String(input.labor));
  const commission = D(String(input.commission));
  const fixed = D(String(input.fixedExpenses));
  const contribution = revenue.sub(materials).sub(labor).sub(commission);
  const net = contribution.sub(fixed);
  return { contribution, net, materials, labor, commission, fixed, revenue };
}
