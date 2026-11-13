import { HomeSkeleton } from "@/components/skeletons/alumni";
import { getServerTranslations } from "@/lib/i18n-server";

export default async function Loading() {
  const { t } = await getServerTranslations();
  return <HomeSkeleton label={t.common.loading} />;
}
