import Image from "next/image";
import { requireStaff } from "@/lib/auth/staff";
import { adminCopy, read } from "@/lib/admin/data";
import { contrastRatio } from "@/lib/admin/contrast";
import { schoolBranding } from "@/lib/school";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveSettings } from "./actions";
export default async function Settings() {
  const { supabase, school } = await requireStaff("/admin/settings", "settings.manage");
  const { t } = await adminCopy();
  const settings = await read(
    supabase
      .from("institutions")
      .select("email_display_name,reply_to_email,default_locale,branding")
      .eq("id", school.id)
      .single(),
  );
  const branding =
    settings.branding && typeof settings.branding === "object" && !Array.isArray(settings.branding)
      ? settings.branding
      : {};
  const colours = [
    {
      label: t.primary,
      hex: typeof branding.primary_color === "string" ? branding.primary_color : "#0B2159",
    },
    {
      label: t.accent,
      hex: typeof branding.accent_color === "string" ? branding.accent_color : "#7B1E3D",
    },
  ];
  const { logo } = schoolBranding({ ...school, branding: settings.branding });
  return (
    <>
      <div className="shellTitle">
        <div>
          <h1>{t.settings}</h1>
          <p>{t.settingsIntro}</p>
        </div>
      </div>
      <section className="panel">
        <h2>{t.branding}</h2>
        {logo && (
          <Image
            src={logo}
            alt={school.name}
            width={160}
            height={80}
            style={{ objectFit: "contain" }}
          />
        )}
        <div className="formRow">
          {colours.map((c) => {
            const ratio = contrastRatio(c.hex);
            return (
              <div key={c.label} className="adminStack">
                <label className="field">
                  {c.label}
                  <input className="input" readOnly value={c.hex} />
                </label>
                <span className={"tag " + (ratio !== null && ratio >= 4.5 ? "tagGood" : "tagWarn")}>
                  {ratio !== null && ratio >= 4.5 ? t.contrastPass : t.contrastFail}
                  {ratio !== null ? " · " + ratio.toFixed(1) + ":1" : ""}
                </span>
              </div>
            );
          })}
        </div>
        {/* TODO: replace logo after storage uploads are implemented. Branding is read-only. */}
      </section>
      <section className="panel">
        <h2>{t.email}</h2>
        <ActionForm action={saveSettings} label={t.save} t={t}>
          <label className="field">
            {t.senderName}
            <input
              className="input"
              name="sender"
              maxLength={120}
              defaultValue={settings.email_display_name ?? ""}
            />
          </label>
          <label className="field">
            {t.replyTo}
            <input
              className="input"
              name="reply_to"
              type="email"
              maxLength={254}
              defaultValue={settings.reply_to_email ?? ""}
            />
          </label>
          <label className="field">
            {t.defaultLanguage}
            <select className="input" name="locale" defaultValue={settings.default_locale}>
              <option value="en">{t.english}</option>
              <option value="fr">{t.french}</option>
            </select>
          </label>
        </ActionForm>
      </section>
    </>
  );
}
