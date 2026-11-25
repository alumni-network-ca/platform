import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAccess } from "@/lib/auth/account";
import { getServerTranslations } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { hasSchoolPage, schoolPageFromRow } from "@/lib/school-page";
import { SchoolPageView } from "@/components/school/SchoolPageView";
import { frame, pageTitle } from "@/components/alumni/parts";

// The school's own links and contacts for signed-in alumni (SCH-03; design SchoolPage). school_pages is read under
// RLS, so only members of this school get a row. A school that filled in nothing has no page.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SchoolPage() {
  const { school, supabase } = await requireAccess("/school");
  const { locale, t } = await getServerTranslations();
  const { data, error } = await supabase
    .from("school_pages")
    .select("*")
    .eq("institution_id", school.id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the school page: ${error.message}`);
  const page = schoolPageFromRow(data);
  if (!hasSchoolPage(page)) notFound();
  const { shortName } = schoolBranding(school);
  return (
    <main className={frame.stack}>
      <div className="flex flex-col gap-1.5">
        <h1 className={pageTitle}>{school.name}</h1>
        <p className="text-md text-subtle-foreground">{t.schoolPage.subtitle}</p>
      </div>
      <SchoolPageView page={page} locale={locale} school={school.name} shortName={shortName} />
    </main>
  );
}
