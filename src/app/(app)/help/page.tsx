import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@/lib/locale";
import { HelpFaq } from "@/components/help-faq";

export default async function HelpPage() {
  const { locale } = await getTranslator();
  return <HelpFaq locale={locale} />;
}
