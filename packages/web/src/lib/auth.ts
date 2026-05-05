import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

const db = new Database("./hexo-cms.db");
db.pragma("journal_mode = WAL");

// Initialize database tables on startup
try {
  db.exec(`
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL DEFAULT 0, image TEXT,
    createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY, expiresAt INTEGER NOT NULL, token TEXT NOT NULL UNIQUE,
    createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL,
    ipAddress TEXT, userAgent TEXT, userId TEXT NOT NULL REFERENCES user(id)
  );
  CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY, accountId TEXT NOT NULL, providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id),
    accessToken TEXT, refreshToken TEXT, idToken TEXT,
    accessTokenExpiresAt INTEGER, refreshTokenExpiresAt INTEGER,
    scope TEXT, password TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY, identifier TEXT NOT NULL, value TEXT NOT NULL,
    expiresAt INTEGER NOT NULL, createdAt INTEGER, updatedAt INTEGER
  );
`);
  console.log("[auth] Database tables initialized");
} catch (err) {
  console.error("[auth] Database init failed:", err);
}

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
