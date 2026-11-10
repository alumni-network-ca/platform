"use client";

import { useState } from "react";
import type { EducationRow } from "@/lib/profile/fields";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { subSection } from "./FormCard";
import { TextInput, type ProfileCopy } from "./ProfileForm";

// Fields line up by their top, so a hint or an error under one never moves its neighbours.
const rowBox =
  "grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] items-start gap-3 rounded-lg border bg-background/50 px-4 py-3.5";

type Role = {
  job_title: string;
  employer: string | null;
  location: string | null;
  start_year: number | null;
  start_month: number | null;
  end_year: number | null;
  end_month: number | null;
};

/** A month picker's value: "2019-03". A role saved with a year only shows as its January. */
const monthValue = (year: number | null, month: number | null) =>
  year ? `${year}-${String(month ?? 1).padStart(2, "0")}` : "";

let nextKey = 0;
const keyed = <T,>(rows: T[]) => rows.map((row) => ({ key: nextKey++, row }));

/** Rows the alumnus adds and removes. Every row's fields post in order, so row i's errors are "field.i". */
function useRows<T>(initial: T[], blank: T) {
  const [rows, setRows] = useState(() => keyed(initial.length ? initial : [blank]));
  return {
    rows,
    add: () => setRows((current) => [...current, ...keyed([blank])]),
    remove: (key: number) => setRows((current) => current.filter((r) => r.key !== key)),
  };
}

export function EducationRows({ initial, t }: { initial: EducationRow[]; t: ProfileCopy }) {
  const { rows, add, remove } = useRows<EducationRow>(initial, {
    school: "",
    degree: "",
    field_of_study: "",
    graduation_year: null,
  });
  return (
    <div className={subSection}>
      {rows.map(({ key, row }, i) => (
        <div key={key} className={rowBox} role="group" aria-label={`${t.school} ${i + 1}`}>
          <TextInput
            name="school"
            errorKey={`school.${i}`}
            label={t.school}
            defaultValue={row.school}
            maxLength={120}
          />
          <TextInput
            name="degree"
            errorKey={`degree.${i}`}
            label={t.degree}
            defaultValue={row.degree}
            maxLength={120}
            optional
          />
          <TextInput
            name="field_of_study"
            errorKey={`field_of_study.${i}`}
            label={t.fieldOfStudy}
            defaultValue={row.field_of_study}
            maxLength={120}
            optional
          />
          <TextInput
            name="graduation_year"
            errorKey={`graduation_year.${i}`}
            label={t.year}
            defaultValue={row.graduation_year}
            inputMode="numeric"
            maxLength={4}
            digits
            optional
          />
          <RemoveButton label={t.remove} onClick={() => remove(key)} />
        </div>
      ))}
      <AddButton label={t.addSchool} onClick={add} />
    </div>
  );
}

export function RoleRows({ initial, t }: { initial: Role[]; t: ProfileCopy }) {
  const { rows, add, remove } = useRows<Role>(initial, {
    job_title: "",
    employer: "",
    location: "",
    start_year: null,
    start_month: null,
    end_year: null,
    end_month: null,
  });
  return (
    <div className={subSection}>
      {rows.map(({ key, row }, i) => (
        <div
          key={key}
          // A role: title, employer and city, then its dates, then Remove.
          className={cn(rowBox, "grid-cols-3 max-[720px]:grid-cols-1")}
          role="group"
          aria-label={`${t.previousRoles} ${i + 1}`}
        >
          <TextInput
            name="role_title"
            errorKey={`role_title.${i}`}
            label={t.jobTitle}
            defaultValue={row.job_title}
            maxLength={120}
          />
          <TextInput
            name="role_employer"
            errorKey={`role_employer.${i}`}
            label={t.roleEmployer}
            defaultValue={row.employer}
            maxLength={120}
          />
          <TextInput
            name="role_location"
            errorKey={`role_location.${i}`}
            label={t.roleLocation}
            defaultValue={row.location}
            maxLength={120}
          />
          <TextInput
            name="role_start"
            errorKey={`role_start.${i}`}
            label={t.startYear}
            type="month"
            placeholder={t.monthPlaceholder}
            defaultValue={monthValue(row.start_year, row.start_month)}
          />
          <TextInput
            name="role_end"
            errorKey={`role_end.${i}`}
            label={t.endYear}
            type="month"
            placeholder={t.monthPlaceholder}
            hint={t.endHint}
            defaultValue={monthValue(row.end_year, row.end_month)}
          />
          <RemoveButton label={t.remove} onClick={() => remove(key)} />
        </div>
      ))}
      <AddButton label={t.addRole} onClick={add} />
    </div>
  );
}

/** On its own line at the bottom of the row, in the colour of a removal. */
function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="destructive-outline"
      size="sm"
      className="col-span-full justify-self-start"
      onClick={onClick}
    >
      <Trash2 aria-hidden />
      {label}
    </Button>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" className="self-start" onClick={onClick}>
      <Plus aria-hidden strokeWidth={2.4} />
      {label}
    </Button>
  );
}
