import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  database: drizzleAdapter(db, { provider: "sqlite" }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      scope: ["repo", "user"],
    },
  },
  trustedOrigins: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
});

export type Session = typeof auth.$Infer.Session;
