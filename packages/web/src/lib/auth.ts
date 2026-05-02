import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

const db = new Database("./hexo-cms.db");

export const auth = betterAuth({
  database: db,
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
