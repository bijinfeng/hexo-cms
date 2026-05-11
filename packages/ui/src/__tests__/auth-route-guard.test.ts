import { describe, expect, it } from "vitest";
import { getAuthRedirect } from "../lib/auth-route-guard";
import type { AuthSession } from "../types/auth";

describe("auth route guard", () => {
  it("requires authentication before onboarding", () => {
    const session: AuthSession = { state: "anonymous" };

    expect(getAuthRedirect({ pathname: "/onboarding", session, isPending: false })).toBe("/login");
  });

  it("keeps authenticated users on onboarding", () => {
    const session: AuthSession = { state: "authenticated" };

    expect(getAuthRedirect({ pathname: "/onboarding", session, isPending: false })).toBeNull();
  });

  it("redirects authenticated users away from login", () => {
    const session: AuthSession = { state: "authenticated" };

    expect(getAuthRedirect({ pathname: "/login", session, isPending: false })).toBe("/");
  });

  it("routes an authenticated user without repository config to onboarding", () => {
    const session: AuthSession = { state: "authenticated" };

    expect(getAuthRedirect({
      pathname: "/",
      session,
      hasConfig: false,
      isPending: false,
    })).toBe("/onboarding");
  });

  it("allows an authenticated user with repository config into protected routes", () => {
    const session: AuthSession = { state: "authenticated" };

    expect(getAuthRedirect({
      pathname: "/posts",
      session,
      hasConfig: true,
      isPending: false,
    })).toBeNull();
  });

  it("routes an authenticated user without config from login to onboarding", () => {
    const session: AuthSession = { state: "authenticated" };

    expect(getAuthRedirect({
      pathname: "/login",
      session,
      hasConfig: false,
      isPending: false,
    })).toBe("/onboarding");
  });

  it("keeps authenticated users on onboarding even before config exists", () => {
    const session: AuthSession = { state: "authenticated" };

    expect(getAuthRedirect({
      pathname: "/onboarding",
      session,
      hasConfig: false,
      isPending: false,
    })).toBeNull();
  });
});
