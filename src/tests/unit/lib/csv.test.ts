import { describe, expect, it } from "vitest";
import { csvCell, csvDocument } from "@/lib/csv";

describe("csv", () => {
  it.each([
    ['=HYPERLINK("http://x")', '"\'=HYPERLINK(""http://x"")"'],
    ["+1 514 555 0100", "'+1 514 555 0100"],
    ["-2+3", "'-2+3"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["\tcmd", "'\tcmd"],
    ["\r=1", '"\'\r=1"'],
  ])("neutralizes the formula %j", (value, cell) => {
    expect(csvCell(value)).toBe(cell);
  });

  it("quotes commas, quotes and line breaks and leaves plain text alone", () => {
    expect(csvCell("Montréal, QC")).toBe('"Montréal, QC"');
    expect(csvCell('Say "hi"')).toBe('"Say ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell("Cohen")).toBe("Cohen");
  });

  it("writes numbers as they are and empty cells for null", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(2010)).toBe("2010");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });

  it("starts with a byte order mark and ends every row with CRLF", () => {
    expect(
      csvDocument([
        ["a", "b"],
        [1, null],
      ]),
    ).toBe("\uFEFFa,b\r\n1,\r\n");
  });
});
