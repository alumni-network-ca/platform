// Failures that retrying cannot fix: the outbox worker marks the row failed at once instead of backing off.

/** The provider refused the email for good, such as an invalid address or an unverified sender domain. */
export class PermanentEmailError extends Error {}

/** The row's data can't produce an email: no school, or the request or profile it is about no longer exists. */
export class PermanentDataError extends Error {}
