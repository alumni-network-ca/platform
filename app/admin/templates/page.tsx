import Link from "next/link";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, read, type Search } from "@/lib/admin/data";
import { templateKeys } from "@/lib/admin/templates";
import { TemplateEditor } from "./TemplateEditor";
export default async function Templates({ searchParams }: { searchParams: Search }) {
  const { supabase, school } = await requireStaff("/admin/templates", "templates.manage");
  const { t } = await adminCopy();
  const p = await searchParams;
  const key = templateKeys.find((key) => key === p.key) ?? "access_approved",
    locale = p.locale === "fr" ? "fr" : "en";
  const [schoolTemplates, defaults] = await Promise.all([
    read(supabase.from("email_templates").select("*").eq("institution_id", school.id)),
    read(
      supabase
        .from("email_templates")
        .select("*")
        .is("institution_id", null)
        .eq("status", "approved"),
    ),
  ]);
  const versions = schoolTemplates.filter((row) => row.key === key && row.locale === locale);
  const current =
    versions.find((row) => row.status === "draft") ??
    versions.find((row) => row.status === "approved") ??
    defaults.find((row) => row.key === key && row.locale === locale);
  const status = (k: typeof key, l: "en" | "fr") => {
    const versions = schoolTemplates.filter((row) => row.key === k && row.locale === l);
    return [
      versions.some((v) => v.status === "approved") ? t.approved : t.missing,
      versions.some((v) => v.status === "draft") ? t.draft : null,
    ]
      .filter(Boolean)
      .join(" · ");
  };
  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>{t.templates}</h1>
          <p>{t.templatesIntro}</p>
        </div>
      </div>
      <div className="panelGrid">
        <nav className="panel" aria-label={t.templates}>
          {templateKeys.map((k) => (
            <Link
              key={k}
              href={"?key=" + k + "&locale=" + locale}
              aria-current={k === key ? "page" : undefined}
            >
              <strong>{t[k]}</strong>
              <span className="cellSub">
                EN: {status(k, "en")} · FR: {status(k, "fr")}
              </span>
            </Link>
          ))}
        </nav>
        <section className="panel">
          <h2>{t[key]}</h2>
          <nav className="adminTabs" aria-label={t.defaultLanguage}>
            <Link
              href={"?key=" + key + "&locale=en"}
              aria-current={locale === "en" ? "page" : undefined}
            >
              {t.english}
            </Link>
            <Link
              href={"?key=" + key + "&locale=fr"}
              aria-current={locale === "fr" ? "page" : undefined}
            >
              {t.french}
            </Link>
          </nav>
          <TemplateEditor
            key={key + locale}
            templateKey={key}
            locale={locale}
            subject={current?.subject ?? ""}
            body={current?.body ?? ""}
            t={t}
          />
        </section>
      </div>
    </>
  );
}
