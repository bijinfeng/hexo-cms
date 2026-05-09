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
});
