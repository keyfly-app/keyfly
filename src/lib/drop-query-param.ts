/** Takes a one-off flag (?created=1, ?add=…) out of the address bar once it has done its job, so reloads and shared links stay clean. */
export function dropQueryParam(name: string) {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(name)) return;
  url.searchParams.delete(name);
  window.history.replaceState(window.history.state, "", url);
}
