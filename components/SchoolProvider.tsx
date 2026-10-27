"use client";

import { createContext, useContext } from "react";
import type { PublicSchool } from "@/lib/school";

const SchoolContext = createContext<PublicSchool | null>(null);

/** Gives client components the school of the current address (resolved by proxy.ts, set in the root layout). */
export function SchoolProvider({
  school,
  children,
}: {
  school: PublicSchool | null;
  children: React.ReactNode;
}) {
  return <SchoolContext value={school}>{children}</SchoolContext>;
}

/** The school of the current address. Only components rendered on a school's pages may call it. */
export function useSchool(): PublicSchool {
  const school = useContext(SchoolContext);
  if (!school) throw new Error("useSchool() is only available on a school's address.");
  return school;
}
