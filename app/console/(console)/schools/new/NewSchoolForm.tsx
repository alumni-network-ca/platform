"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { schoolUrl, slugFromName, type Origin } from "@/lib/tenant/address";
import { DEFAULT_ACCENT, DEFAULT_PRIMARY } from "@/lib/theme";
import { createSchool, type CreateSchoolResult } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ui } from "@/components/admin/parts";
import { Alert } from "@/components/ui/alert";

export function NewSchoolForm({ origin }: { origin: Origin }) {
  const [result, action, pending] = useActionState<CreateSchoolResult, FormData>(createSchool, {
    error: null,
  });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const address = slug ?? slugFromName(name);
  const shortName = name.replace(/\s+(High School|School|Academy)$/i, "").trim();

  return (
    <form action={action} className={ui.formStack}>
      <section className={ui.panel}>
        <h2>Identity</h2>
        <label className={ui.field}>
          School name
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
          />
        </label>
        <div className={ui.formRow}>
          <label className={ui.field}>
            Short name
            <Input name="short_name" placeholder={shortName} maxLength={40} />
            <span className={ui.fieldHint}>
              Used in “{shortName || "Short name"} Alumni Network”. Empty: the full name.
            </span>
          </label>
          <label className={ui.field}>
            Web address
            <Input
              name="slug"
              value={address}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              pattern="[a-z0-9-]{2,40}"
              required
            />
            <span className={ui.fieldHint}>
              {address ? new URL(schoolUrl(origin, address)).host : "Pick an address"}
            </span>
          </label>
        </div>
      </section>

      <section className={ui.panel}>
        <h2>Branding and email</h2>
        <div className={ui.formRow}>
          <label className={ui.field}>
            Logo
            <Input name="logo" placeholder="/school-logo.png or https://…" />
            <span className={ui.fieldHint}>
              A path on this site or an https address. Upload comes later.
            </span>
          </label>
          <label className={ui.field}>
            Primary colour
            <Input type="color" name="primary_color" defaultValue={DEFAULT_PRIMARY} />
          </label>
          <label className={ui.field}>
            Accent colour
            <Input type="color" name="accent_color" defaultValue={DEFAULT_ACCENT} />
          </label>
        </div>
        <div className={ui.formRow}>
          <label className={ui.field}>
            Default language
            <NativeSelect name="locale" defaultValue="en">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </NativeSelect>
          </label>
          <label className={ui.field}>
            Replies go to
            <Input type="email" name="reply_to" placeholder="alumni@school.ca" />
          </label>
          <label className={ui.field}>
            Email sender name
            <Input
              name="sender_name"
              placeholder={`${shortName || "School"} Alumni Network`}
              maxLength={80}
            />
          </label>
        </div>
        <p className={ui.fieldHint}>
          The school starts with the platform&apos;s default career fields, “Open to” options and
          email templates in English and French.
        </p>
      </section>

      {result.error && (
        <Alert variant="error" role="alert">
          {result.error}
        </Alert>
      )}
      <div className={ui.formActions}>
        <Button asChild variant="secondary">
          <Link href="/">Cancel</Link>
        </Button>
        <Button loading={pending}>{pending ? "Creating…" : "Create school"}</Button>
      </div>
    </form>
  );
}
