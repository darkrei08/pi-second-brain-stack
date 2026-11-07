const UNAUTHENTICATED_PATHS = new Set(['/healthz', '/readyz']);

export function authenticateRequest({ request, pathname, authenticator }) {
  if (UNAUTHENTICATED_PATHS.has(pathname)) {
    return { owner_id: null };
  }
  return authenticator.authenticate(request.headers);
}
