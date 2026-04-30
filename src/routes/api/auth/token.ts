import { createAPIFileRoute } from "@tanstack/react-start/api";
import { auth } from "#/lib/auth";
import Database from "better-sqlite3";

const db = new Database("./hexo-cms.db");

export const APIRoute = createAPIFileRoute("/api/auth/token")({
  GET: async ({ request }) => {
    try {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const account = db
        .prepare("SELECT * FROM account WHERE userId = ? AND providerId = 'github'")
        .get(session.user.id) as any;

      if (!account || !account.accessToken) {
        return new Response(
          JSON.stringify({ error: "No GitHub account linked" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ accessToken: account.accessToken }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Failed to get access token:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get access token" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
});
