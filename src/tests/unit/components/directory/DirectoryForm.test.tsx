import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DirectoryForm, ResetLink, type FormValues } from "@/components/directory/DirectoryForm";

vi.mock("next/form", () => ({
  default: ({ ref, ...props }: React.ComponentProps<"form">) => (
    <form ref={ref} {...props} onSubmit={(event) => event.preventDefault()} />
  ),
}));
vi.mock("next/link", () => ({
  default: ({ href, onClick, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a
      href={href}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
      {...props}
    />
  ),
}));

// The fields are uncontrolled, as on the page: defaultValue and defaultChecked only apply when they mount.
function Fields({ values }: { values: FormValues }) {
  return (
    <DirectoryForm values={values}>
      <input aria-label="Search" type="search" name="q" defaultValue={values.q as string} />
      <select aria-label="City" name="city" defaultValue={values.city as string}>
        <option value="">Anywhere</option>
        <option value="Toronto">Toronto</option>
      </select>
      <select aria-label="Sort" name="sort" defaultValue={values.sort as string}>
        <option value="recent">Recent</option>
        <option value="name">Name</option>
      </select>
      {["mentoring", "career_advice"].map((offer) => (
        <label key={offer}>
          <input
            type="checkbox"
            name="offer"
            value={offer}
            defaultChecked={(values.offer as string[]).includes(offer)}
          />
          {offer}
        </label>
      ))}
      <ResetLink href="/directory">Reset all</ResetLink>
    </DirectoryForm>
  );
}

const none: FormValues = { q: "", city: "", offer: [], sort: "recent" };
const some: FormValues = { q: "maya", city: "Toronto", offer: ["mentoring"], sort: "name" };

describe("DirectoryForm", () => {
  it("puts every field back when the URL's filters change, as after Reset all or a chip", async () => {
    // Someone picks filters (each one submits, and the page comes back with them in the URL)...
    const { rerender } = render(<Fields values={none} />);
    await userEvent.type(screen.getByLabelText("Search"), "maya");
    await userEvent.selectOptions(screen.getByLabelText("City"), "Toronto");
    await userEvent.selectOptions(screen.getByLabelText("Sort"), "name");
    await userEvent.click(screen.getByLabelText("mentoring"));
    rerender(<Fields values={some} />);
    expect(screen.getByLabelText("mentoring")).toBeChecked();

    // ...then a link takes the URL back to no filters.

    rerender(<Fields values={none} />);
    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(screen.getByLabelText("City")).toHaveValue("");
    expect(screen.getByLabelText("Sort")).toHaveValue("recent");
    expect(screen.getByLabelText("mentoring")).not.toBeChecked();
    expect(screen.getByLabelText("career_advice")).not.toBeChecked();

    // Removing one option's chip unticks only that option.
    await userEvent.click(screen.getByLabelText("mentoring"));
    await userEvent.click(screen.getByLabelText("career_advice"));
    rerender(<Fields values={{ ...none, offer: ["mentoring", "career_advice"] }} />);
    rerender(<Fields values={{ ...none, offer: ["career_advice"] }} />);
    expect(screen.getByLabelText("mentoring")).not.toBeChecked();
    expect(screen.getByLabelText("career_advice")).toBeChecked();
  });

  it("empties the filters at once from a reset link, but keeps the sort", async () => {
    render(<Fields values={{ ...none, sort: "name" }} />);
    await userEvent.type(screen.getByLabelText("Search"), "not searched yet");
    await userEvent.selectOptions(screen.getByLabelText("City"), "Toronto");
    await userEvent.click(screen.getByLabelText("mentoring"));

    await userEvent.click(screen.getByRole("link", { name: "Reset all" }));
    expect(screen.getByLabelText("Search")).toHaveValue("");
    expect(screen.getByLabelText("City")).toHaveValue("");
    expect(screen.getByLabelText("mentoring")).not.toBeChecked();
    expect(screen.getByLabelText("Sort")).toHaveValue("name");
  });
});
