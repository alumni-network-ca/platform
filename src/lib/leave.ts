/**
 * Loads `url` as a new page from a form action, and keeps the form busy until it does. The returned promise never
 * settles, so useActionState stays pending: the button keeps its spinner and a second click cannot submit again
 * while the next page loads. A full load (not router.push) lets the server read cookies the action just wrote.
 */
export function leaveTo(url: string): Promise<never> {
  window.location.assign(url);
  return new Promise<never>(() => {});
}
