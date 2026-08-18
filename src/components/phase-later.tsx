import { createT, type Locale } from "@core/shared/i18n/i18n";

export function PhaseLater({
  title,
  locale = "ru",
}: {
  phase?: string;
  title: string;
  locale?: Locale;
}) {
  const t = createT(locale);
  return (
    <section className="ui-card">
      <h1 className="page-title">{title}</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{t("phase.unavailable")}</p>
    </section>
  );
}
