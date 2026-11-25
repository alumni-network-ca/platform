// CSV for spreadsheets (EXP-01). RFC 4180 quoting, CRLF line ends, and a UTF-8 byte order mark so Excel reads
// accents correctly. A text cell that a spreadsheet would run as a formula (it starts with = + - @, a tab or a
// carriage return) gets a leading apostrophe, so an alumnus can't plant a formula in the school's file.

const formulaStart = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && formulaStart.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}

export function csvDocument(rows: (string | number | null | undefined)[][]): string {
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
