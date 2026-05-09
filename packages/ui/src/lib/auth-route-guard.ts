import type { AuthSession } from "../types/auth";

const PUBLIC_ROUTES = new Set(["/login"]);

export function getAuthRedirect({
  pathname,
  session,
  isPending,
}: {
  pathname: string;
  session: AuthSession | null;
  isPending: boolean;
}): "/" | "/login" | null {
  if (isPending) return null;

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isAuthenticated = session?.state === "authenticated";

  if (!isAuthenticated && !isPublicRoute) return "/login";
  if (isAuthenticated && isPublicRoute) return "/";

  return null;
}

export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname);
}
