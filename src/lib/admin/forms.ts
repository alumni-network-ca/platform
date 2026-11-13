import type { translations } from "@/lib/i18n";
export type AdminCopy = typeof translations.en.admin | typeof translations.fr.admin;
export type ActionResult = {
  error: "forbidden" | "invalid" | "conflict" | "failed" | null;
  saved?: boolean;
  link?: string;
};
export function actionError(error: { code?: string }): ActionResult {
  return {
    error:
      error.code === "42501"
        ? "forbidden"
        : error.code === "23505"
          ? "conflict"
          : ["22023", "22P02", "23514", "23502"].includes(error.code ?? "")
            ? "invalid"
            : "failed",
  };
}
export const errorMessage = (error: ActionResult["error"], t: AdminCopy) =>
  error === "forbidden"
    ? t.errorForbidden
    : error === "conflict"
      ? t.errorConflict
      : error === "invalid"
        ? t.errorInvalid
        : t.errorFailed;
export const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
