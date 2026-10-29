"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { schoolUrl, slugFromName, type Origin } from "@/lib/tenant/address";
import { createSchool, type CreateSchoolResult } from "./actions";

export function NewSchoolForm({ origin }: { origin: Origin }) {
  const [result, action, pending] = useActionState<CreateSchoolResult, FormData>(createSchool, {
    error: null,
  });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const address = slug ?? slugFromName(name);
  const shortName = name.replace(/\s+(High School|School|Academy)$/i, "").trim();

  return (
    <form action={action} className="formStack">
      <section className="panel">
        <h2>Identity</h2>
        <label className="field">
          School name
          <input
            className="input"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            required
          />
        </label>
        <div className="formRow">
          <label className="field">
            Short name
            <input className="input" name="short_name" placeholder={shortName} maxLength={40} />
            <span className="fieldHint">
              Used in “{shortName || "Short name"} Alumni Network”. Empty: the full name.
            </span>
          </label>
          <label className="field">
            Web address
            <input
              className="input"
              name="slug"
              value={address}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              pattern="[a-z0-9-]{2,40}"
              required
            />
            <span className="fieldHint">
              {address ? new URL(schoolUrl(origin, address)).host : "Pick an address"}
            </span>
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Branding and email</h2>
        <div className="formRow">
          <label className="field">
            Logo
            <input className="input" name="logo" placeholder="/school-logo.png or https://…" />
            <span className="fieldHint">
              A path on this site or an https address. Upload comes later.
            </span>
          </label>
          <label className="field">
            Primary colour
            <input className="input" type="color" name="primary_color" defaultValue="#0B2159" />
          </label>
          <label className="field">
            Accent colour
            <input className="input" type="color" name="accent_color" defaultValue="#7B1E3D" />
          </label>
        </div>
        <div className="formRow">
          <label className="field">
            Default language
            <select className="select" name="locale" defaultValue="en">
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <label className="field">
            Replies go to
            <input className="input" type="email" name="reply_to" placeholder="alumni@school.ca" />
          </label>
          <label className="field">
            Email sender name
            <input
              className="input"
              name="sender_name"
              placeholder={`${shortName || "School"} Alumni Network`}
              maxLength={80}
            />
          </label>
        </div>
        <p className="fieldHint">
          The school starts with the platform&apos;s default career fields, “Open to” options and
          email templates in English and French.
        </p>
      </section>

      {result.error && (
        <div className="notice" role="alert">
          {result.error}
        </div>
      )}
      <div className="formActions">
        <Link className="btn btnLight" href="/console">
          Cancel
        </Link>
        <button className="btn btnPrimary" disabled={pending}>
          {pending ? "Creating…" : "Create school"}
        </button>
      </div>
    </form>
  );
}
