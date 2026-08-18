import { CashShiftControl } from "@/components/cash-shift-control";
import { hasPermission } from "@core/auth/authz";
import { getCashShiftBarData } from "@/lib/cash-shift-data";
import type { Locale } from "@/lib/i18n";

export async function CashShiftBar({
  permissions,
  roleCode,
  locale,
  variant = "light",
}: {
  permissions: string[];
  roleCode: string;
  locale: Locale;
  variant?: "light" | "dark";
}) {
  if (!hasPermission(permissions, roleCode, "finance.view")) {
    return null;
  }

  const data = await getCashShiftBarData();
  if (data.accounts.length === 0) {
    return null;
  }

  return <CashShiftControl data={data} locale={locale} variant={variant} />;
}
