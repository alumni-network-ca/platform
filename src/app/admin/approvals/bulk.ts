// Field names shared by the page (server) and BulkApproveForm (client). Kept out of the "use client" module, whose
// exports reach a server component as client references, not values.
/** One checkbox per pending row; its value is the request id. */
export const ROW_BOX = "id";
/** The "select all on this page" box in the table head. */
export const ALL_BOX = "select-all";
