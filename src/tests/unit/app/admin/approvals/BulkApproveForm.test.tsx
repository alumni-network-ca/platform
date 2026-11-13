import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { translations } from "@/lib/i18n";
import type { BulkResult } from "@/app/admin/approvals/actions";
import { BulkApproveForm } from "@/app/admin/approvals/BulkApproveForm";

// The real action needs a request and a database; each test passes its own.
vi.mock("@/app/admin/approvals/actions", () => ({ approveRequests: vi.fn() }));

const people = [
  ["r1", "Dana Levy"],
  ["r2", "Jacob Ohana"],
  ["r3", "Ben Toledano"],
] as const;

function setup(result: BulkResult, locale: "en" | "fr" = "en") {
  const t = translations[locale].admin;
  const action = vi.fn(async (_: BulkResult, form: FormData) => {
    void form;
    return result;
  });
  render(
    <BulkApproveForm t={t} action={action}>
      <table>
        <thead>
          <tr>
            <th>
              <input type="checkbox" name="select-all" aria-label={t.selectAllOnPage} />
            </th>
          </tr>
        </thead>
        <tbody>
          {people.map(([id, name]) => (
            <tr key={id}>
              <td>
                <input type="checkbox" name="id" value={id} aria-label={name} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </BulkApproveForm>,
  );
  return { action, t, user: userEvent.setup() };
}

describe("BulkApproveForm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("counts ticked rows, and select all ticks the whole page", async () => {
    const { user } = setup({ error: null });
    expect(screen.getByText(/Tick requests to approve several at once/)).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Dana Levy" }));
    expect(screen.getByText("1 selected")).toBeTruthy();
    const all = screen.getByRole("checkbox", {
      name: "Select all on this page",
    }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    await user.click(all);
    expect(screen.getByText("3 selected")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Approve 3" })).toBeTruthy();
    await user.click(all);
    expect(screen.queryByRole("button", { name: /^Approve/ })).toBeNull();
    await user.click(screen.getByRole("checkbox", { name: "Jacob Ohana" }));
    await user.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(screen.queryByText(/selected/)).toBeNull();
  });

  it("asks first, with the count, and Cancel sends nothing", async () => {
    const { action, user } = setup({ error: null });
    await user.click(screen.getByRole("checkbox", { name: "Dana Levy" }));
    await user.click(screen.getByRole("checkbox", { name: "Ben Toledano" }));
    await user.click(screen.getByRole("button", { name: "Approve 2" }));
    const dialog = screen.getByRole("alertdialog", { name: "Approve 2 requests?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it("sends the ticked ids and shows what was approved and what was skipped", async () => {
    const { action, user } = setup({
      error: null,
      approved: [{ id: "r2", name: "Jacob Ohana" }],
      skipped: [
        { id: "r1", name: "Dana Levy", reason: "possible_match" },
        { id: "r3", name: "Ben Toledano", reason: "has_profile" },
      ],
    });
    await user.click(screen.getByRole("checkbox", { name: "Select all on this page" }));
    await user.click(screen.getByRole("button", { name: "Approve 3" }));
    const dialog = screen.getByRole("alertdialog", { name: "Approve 3 requests?" });
    await user.click(within(dialog).getByRole("button", { name: "Approve 3 requests" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.lastCall?.[1].getAll("id")).toEqual(["r1", "r2", "r3"]);

    const summary = await screen.findByRole("status");
    expect(summary.textContent).toContain("1 approved, 2 skipped");
    expect(summary.textContent).toContain("Jacob Ohana");
    expect(summary.textContent).toContain("Dana Levy: possible match, review it on its own page");
    expect(summary.textContent).toContain("Ben Toledano: already has a profile");
    expect(
      within(summary)
        .getAllByRole("link", { name: "Review" })
        .map((a) => a.getAttribute("href")),
    ).toEqual(["/admin/approvals/r1", "/admin/approvals/r3"]);
    // Start again from nothing ticked.
    await waitFor(() =>
      expect(
        (screen.getByRole("checkbox", { name: "Dana Levy" }) as HTMLInputElement).checked,
      ).toBe(false),
    );
    expect(screen.queryByRole("button", { name: /^Approve/ })).toBeNull();
  });

  it("keeps the summary when the last rows are approved and the queue empties", async () => {
    const t = translations.en.admin;
    const action = vi.fn(async () => ({
      error: null,
      approved: [{ id: "r1", name: "Dana Levy" }],
      skipped: [],
    }));
    const user = userEvent.setup();
    const { rerender } = render(
      <BulkApproveForm t={t} action={action}>
        <input type="checkbox" name="id" value="r1" aria-label="Dana Levy" />
      </BulkApproveForm>,
    );
    await user.click(screen.getByRole("checkbox", { name: "Dana Levy" }));
    await user.click(screen.getByRole("button", { name: "Approve 1" }));
    await user.click(screen.getByRole("button", { name: "Approve 1 request" }));
    await screen.findByText("1 approved, 0 skipped");
    // The page re-renders with no pending rows left.
    rerender(
      <BulkApproveForm t={t} action={action} hasRows={false}>
        <p>{t.empty}</p>
      </BulkApproveForm>,
    );
    expect(screen.getByText("1 approved, 0 skipped")).toBeTruthy();
    expect(screen.queryByText(/Tick requests to approve several at once/)).toBeNull();
  });

  it("speaks French", async () => {
    const { user } = setup(
      {
        error: null,
        approved: [],
        skipped: [{ id: "r1", name: "Dana Levy", reason: "not_pending" }],
      },
      "fr",
    );
    await user.click(screen.getByRole("checkbox", { name: "Dana Levy" }));
    expect(screen.getByText("Sélection : 1")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Approuver (1)" }));
    const dialog = screen.getByRole("alertdialog", { name: "Approuver 1 demande?" });
    await user.click(within(dialog).getByRole("button", { name: "Approuver 1 demande" }));
    const summary = await screen.findByRole("status");
    expect(summary.textContent).toContain("Approuvées : 0 · Ignorées : 1");
    expect(summary.textContent).toContain("Dana Levy: n’est plus en attente");
  });

  it("shows an error when the action fails", async () => {
    const { user } = setup({ error: "forbidden" });
    await user.click(screen.getByRole("checkbox", { name: "Dana Levy" }));
    await user.click(screen.getByRole("button", { name: "Approve 1" }));
    await user.click(screen.getByRole("button", { name: "Approve 1 request" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      translations.en.admin.errorForbidden,
    );
    expect(screen.getByText("1 selected")).toBeTruthy();
  });
});
