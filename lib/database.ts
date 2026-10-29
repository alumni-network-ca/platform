import type { Database as Generated, Json } from "@/lib/database.types";

// lib/database.types.ts is generated (`npm run db:types`) and CI fails if it drifts from the migrations.
// The generator types jsonb results as `Json` and every function result column as non-null, so the RPCs
// the app reads are narrowed here to what their SQL actually returns.

export type { Json, Enums, Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

type Fns = Generated["public"]["Functions"];

export type PublicSchool = {
  id: string;
  name: string;
  slug: string;
  default_locale: Generated["public"]["Enums"]["locale"];
  branding: Json;
};

export type DirectoryRow = {
  [K in keyof Fns["search_directory"]["Returns"][number]]: K extends
    "id" | "first_name" | "last_name" | "grad_year" | "offers" | "schools" | "total_count"
    ? Fns["search_directory"]["Returns"][number][K]
    : Fns["search_directory"]["Returns"][number][K] | null;
};

type Overrides = {
  admin_dashboard: { Args: Fns["admin_dashboard"]["Args"]; Returns: AdminDashboard };
  admin_profile_email: { Args: Fns["admin_profile_email"]["Args"]; Returns: string | null };
  decide_access_request: { Args: Fns["decide_access_request"]["Args"]; Returns: string | null };
  school_staff: { Args: Fns["school_staff"]["Args"]; Returns: SchoolStaff[] };
  admin_roster: { Args: Fns["admin_roster"]["Args"]; Returns: AdminRosterRow[] };
  public_school: { Args: Fns["public_school"]["Args"]; Returns: PublicSchool | null };
  search_directory: { Args: Fns["search_directory"]["Args"]; Returns: DirectoryRow[] };
};

export type AdminDashboard = {
  pending: number;
  needs_info: number;
  approved_not_published: number;
  published: number;
  oldest_pending_at: string | null;
};
export type SchoolStaff = Omit<Fns["school_staff"]["Returns"][number], "name" | "email"> & {
  name: string | null;
  email: string | null;
};
export type RosterState =
  "published" | "hidden" | "onboarding" | "suspended" | "archived" | "deceased";
export type AdminRosterRow = {
  [K in keyof Fns["admin_roster"]["Returns"][number]]: K extends
    "preferred_name" | "city" | "country" | "job_title" | "employer" | "last_confirmed_at"
    ? Fns["admin_roster"]["Returns"][number][K] | null
    : K extends "state"
      ? RosterState
      : Fns["admin_roster"]["Returns"][number][K];
};

export type Database = Omit<Generated, "public"> & {
  public: Omit<Generated["public"], "Functions"> & {
    Functions: Omit<Fns, keyof Overrides> & Overrides;
  };
};
