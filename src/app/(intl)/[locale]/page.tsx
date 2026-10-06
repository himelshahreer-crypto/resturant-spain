import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { Phase1Placeholder } from "../../phase1-placeholder";

export default async function HomeIntl({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <Phase1Placeholder locale={locale} />;
}
