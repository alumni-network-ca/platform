"use client";

import { useState } from "react";
import type { EducationRow } from "@/lib/profile/fields";
import { TextInput, type ProfileCopy } from "./ProfileForm";

type Role = {
  job_title: string;
  employer: string | null;
  location: string | null;
  start_year: number | null;
  end_year: number | null;
  is_current: boolean;
};

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
    <div className="onbSection">
      {rows.map(({ key, row }, i) => (
        <div key={key} className="onbRow" role="group" aria-label={`${t.school} ${i + 1}`}>
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
            optional
          />
          <button type="button" className="onbButton" onClick={() => remove(key)}>
            {t.remove}
          </button>
        </div>
      ))}
      <button type="button" className="onbButton onbAdd" onClick={add}>
        <PlusIcon /> {t.addSchool}
      </button>
    </div>
  );
}

export function RoleRows({ initial, t }: { initial: Role[]; t: ProfileCopy }) {
  const { rows, add, remove } = useRows<Role>(initial, {
    job_title: "",
    employer: "",
    location: "",
    start_year: null,
    end_year: null,
    is_current: false,
  });
  return (
    <div className="onbSection">
      {rows.map(({ key, row }, i) => (
        <div key={key} className="onbRow" role="group" aria-label={`${t.previousRoles} ${i + 1}`}>
          <input type="hidden" name="role_current" value={row.is_current ? "true" : ""} />
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
            defaultValue={row.start_year}
            inputMode="numeric"
            maxLength={4}
          />
          {row.is_current ? (
            <input type="hidden" name="role_end" value="" />
          ) : (
            <TextInput
              name="role_end"
              errorKey={`role_end.${i}`}
              label={t.endYear}
              defaultValue={row.end_year}
              inputMode="numeric"
              maxLength={4}
            />
          )}
          <button type="button" className="onbButton" onClick={() => remove(key)}>
            {t.remove}
          </button>
        </div>
      ))}
      <button type="button" className="onbButton onbAdd" onClick={add}>
        <PlusIcon /> {t.addRole}
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
