import { expect, it } from "vitest";

it("refuses to load outside the server, so the secret key cannot reach a browser bundle", async () => {
  await expect(import("./admin")).rejects.toThrow(/cannot be imported from a Client Component/);
});
