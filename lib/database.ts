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
  public_school: { Args: Fns["public_school"]["Args"]; Returns: PublicSchool | null };
  search_directory: { Args: Fns["search_directory"]["Args"]; Returns: DirectoryRow[] };
};

export type Database = Omit<Generated, "public"> & {
  public: Omit<Generated["public"], "Functions"> & {
    Functions: Omit<Fns, keyof Overrides> & Overrides;
  };
};
