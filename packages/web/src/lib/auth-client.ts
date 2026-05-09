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

export const webAuthClient: AuthClient = {
  async getSession() {
    const session = await authClient.getSession();
    return normalizeSession(session.data);
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
