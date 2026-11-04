// Names shared by proxy.ts, server components and the links between schools' addresses (ADR 0001).

/** Request header the proxy sets to the resolved school. Any client-sent value is overwritten. */
export const SCHOOL_HEADER = "x-school";
/** Cookie that picks the school on Vercel PR previews, which have no school subdomain. Ignored elsewhere. */
export const PREVIEW_COOKIE = "tenant";
/** Preview cookie value for the root site (the console). "root" is a reserved address, never a school. */
export const PREVIEW_ROOT = "root";
