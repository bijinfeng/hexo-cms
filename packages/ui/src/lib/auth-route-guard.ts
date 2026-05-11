import type { AuthSession } from "../types/auth";

const PUBLIC_ROUTES = new Set(["/login"]);
const ONBOARDING_ROUTE = "/onboarding";

export function getAuthRedirect({
  pathname,
  session,
  hasConfig,
  isPending,
}: {
  pathname: string;
  session: AuthSession | null;
  hasConfig?: boolean | null;
  isPending: boolean;
}): "/" | "/login" | "/onboarding" | null {
  if (isPending) return null;

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isOnboardingRoute = pathname === ONBOARDING_ROUTE;
  const isAuthenticated = session?.state === "authenticated";

  if (!isAuthenticated) {
    if (isPublicRoute) return null;
    return "/login";
  }

  if (isOnboardingRoute) return null;

  if (hasConfig === false) {
    return "/onboarding";
  }

  if (isPublicRoute) return "/";

  return null;
}

export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname);
}

export function isOnboardingRoute(pathname: string): boolean {
  return pathname === ONBOARDING_ROUTE;
}
