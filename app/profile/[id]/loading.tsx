import { ProfileSkeleton } from "@/components/skeletons/alumni";
import { getServerTranslations } from "@/lib/i18n-server";

export default async function Loading() {
  const { t } = await getServerTranslations();
  return <ProfileSkeleton label={t.common.loading} other />;
}
