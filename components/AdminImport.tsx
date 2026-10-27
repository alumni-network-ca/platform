"use client";
import Papa from "papaparse";
import { useState } from "react";
// Legacy schema until the CSV import (IMP-02, #141) is rebuilt server-side.
import { createLegacyClient as createClient } from "@/lib/supabase/client";
type CsvRow = { first_name?: string; last_name?: string; email?: string; grad_year?: string };
export function AdminImport({ institutionId }: { institutionId: string }) {
  const [status, setStatus] = useState("");
  function handle(file: File) {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const clean = data
          .filter((r) => r.first_name && r.last_name)
          .map((r) => ({
            institution_id: institutionId,
            first_name: r.first_name!.trim(),
            last_name: r.last_name!.trim(),
            claim_email: r.email?.trim().toLowerCase() || null,
            grad_year: r.grad_year ? Number(r.grad_year) : null,
            is_directory_visible: false,
          }));
        const supabase = createClient();
        const { error } = await supabase.from("alumni_profiles").insert(clean);
        setStatus(
          error
            ? error.message
            : `Imported ${clean.length} unclaimed alumni records. They are hidden until claimed.`,
        );
      },
    });
  }
  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3>Import alumni CSV</h3>
      <p className="muted">
        Columns: first_name, last_name, email, grad_year. Imported records remain invisible until
        claimed.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
      />
      {status && <div className="notice">{status}</div>}
    </div>
  );
}
