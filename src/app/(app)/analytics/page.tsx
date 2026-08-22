import { requirePermission } from "@core/auth/authz";
import { getTranslator } from "@core/shared/i18n/locale";
import { AnalyticsReportView } from "./analytics-report-view";
import { loadAnalyticsReport } from "./load-analytics";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requirePermission("analytics.view");
  const { t, locale } = await getTranslator();
  const params = await searchParams;
  const data = await loadAnalyticsReport(params.period, t, locale);

  return <AnalyticsReportView locale={locale} data={data} />;
}
