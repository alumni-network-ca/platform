import { requireStaff } from "@/lib/auth/staff";
import { adminCopy } from "@/lib/admin/data";
import { getServerTranslations } from "@/lib/i18n-server";
import { schoolBranding } from "@/lib/school";
import { hasSchoolPage, schoolPageFromRow, SOCIAL_NETWORKS } from "@/lib/school-page";
import { ActionForm } from "@/components/admin/ActionForm";
import { ui } from "@/components/admin/parts";
import { SchoolPageView } from "@/components/school/SchoolPageView";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSchoolPage } from "./actions";

// School admins edit the page alumni see at /school (SCH-02). Every field is optional; the preview below the form
// is the same component as the alumni page and shows the saved page.
export default async function SchoolPageAdmin() {
  const { supabase, school } = await requireStaff("/admin/school-page", "settings.manage");
  const { t } = await adminCopy();
  const { locale, t: all } = await getServerTranslations();
  const { data, error } = await supabase
    .from("school_pages")
    .select("*")
    .eq("institution_id", school.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const page = schoolPageFromRow(data);
  const { shortName } = schoolBranding(school);
  const url = (name: string, label: string, value: string | null, hint?: string) => (
    <label key={name} className={ui.field}>
      {label}
      <Input
        name={name}
        type="url"
        inputMode="url"
        maxLength={500}
        placeholder="https://"
        defaultValue={value ?? ""}
      />
      <span className="text-sm font-normal text-subtle-foreground">
        {hint ? `${hint} ` : ""}
        {t.httpsHint}
      </span>
    </label>
  );
  return (
    <>
      <div className={ui.shellTitle}>
        <div>
          <h1>{t.schoolPage}</h1>
          <p>{t.schoolPageIntro}</p>
        </div>
      </div>
      <ActionForm action={saveSchoolPage} label={t.save} t={t}>
        <section className={ui.panel}>
          <h2>{t.linksSection}</h2>
          {url("website_url", t.websiteUrl, page.websiteUrl)}
          {url("donate_url", t.donateUrl, page.donateUrl, t.donateHint)}
        </section>
        <section className={ui.panel}>
          <h2>{t.socialSection}</h2>
          {SOCIAL_NETWORKS.map((key) =>
            url(`social_${key}`, all.schoolPage.networks[key], page.social[key] ?? null),
          )}
        </section>
        <section className={ui.panel}>
          <h2>{t.aboutSection}</h2>
          <p className="text-sm text-subtle-foreground">{t.aboutHint}</p>
          <label className={ui.field}>
            {t.aboutEn}
            <Textarea name="about_en" rows={5} maxLength={4000} defaultValue={page.aboutEn ?? ""} />
          </label>
          <label className={ui.field}>
            {t.aboutFr}
            <Textarea name="about_fr" rows={5} maxLength={4000} defaultValue={page.aboutFr ?? ""} />
          </label>
        </section>
        <section className={ui.panel}>
          <h2>{t.locationSection}</h2>
          <label className={ui.field}>
            {t.address}
            <Textarea name="address" rows={2} maxLength={300} defaultValue={page.address ?? ""} />
          </label>
          {url("map_url", t.mapUrl, page.mapUrl, t.mapHint)}
        </section>
        <section className={ui.panel}>
          <h2>{t.officeSection}</h2>
          <label className={ui.field}>
            {t.officeName}
            <Input name="office_name" maxLength={120} defaultValue={page.officeName ?? ""} />
          </label>
          <label className={ui.field}>
            {t.officeEmail}
            <Input
              name="office_email"
              type="email"
              maxLength={254}
              defaultValue={page.officeEmail ?? ""}
            />
          </label>
          <label className={ui.field}>
            {t.officePhone}
            <Input
              name="office_phone"
              type="tel"
              maxLength={40}
              defaultValue={page.officePhone ?? ""}
            />
          </label>
        </section>
      </ActionForm>
      <section className={ui.adminStack} aria-labelledby="school-page-preview">
        <h2 id="school-page-preview" className="text-lg font-bold">
          {t.previewTitle}
        </h2>
        {hasSchoolPage(page) ? (
          <SchoolPageView page={page} locale={locale} school={school.name} shortName={shortName} />
        ) : (
          <p className="text-md text-subtle-foreground">{t.previewEmpty}</p>
        )}
      </section>
    </>
  );
}
