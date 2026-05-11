import { createAuthClient } from "better-auth/react";
import type { AuthClient, AuthSession } from "@hexo-cms/ui";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
});

export const { signIn, signOut, useSession } = authClient;

function normalizeSession(session: unknown): AuthSession {
  if (!session || typeof session !== "object") {
    return { state: "anonymous" };
  }

  const maybeSession = session as {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  };

  if (!maybeSession.user) {
    return { state: "anonymous" };
  }

  return {
    state: "authenticated",
    user: {
      id: maybeSession.user.id,
      name: maybeSession.user.name,
      email: maybeSession.user.email,
      avatarUrl: maybeSession.user.image,
    },
  };
}

async function hasGitHubToken(): Promise<boolean | "reauthorization_required"> {
  const response = await fetch("/api/auth/token");
  if (response.ok) {
    const data = await response.json() as { authenticated?: boolean };
    return data.authenticated === true;
  }

  if (response.status === 401 || response.status === 403) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    if (data?.error === "REAUTH_REQUIRED") return "reauthorization_required";
    return false;
  }

  return false;
}

export const webAuthClient: AuthClient = {
  async getSession() {
    const session = await authClient.getSession();
    const authSession = normalizeSession(session.data);
    if (authSession.state !== "authenticated") return authSession;

    const hasToken = await hasGitHubToken();
    if (hasToken === true) return authSession;
    if (hasToken === "reauthorization_required") {
      return {
        state: "reauthorization_required",
        user: authSession.user,
        error: "AUTH_SCOPE_INSUFFICIENT",
      };
    }
    return { state: "anonymous" };
  },
  async startLogin() {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
    return { state: "authenticating" };
  },
  async signOut() {
    await authClient.signOut();
  },
  async reauthorize() {
    return this.startLogin();
  },
};
