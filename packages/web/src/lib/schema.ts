import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }),
  updatedAt: integer("updatedAt", { mode: "timestamp" }),
});

export const githubConfig = sqliteTable("github_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  branch: text("branch").default("main"),
  postsDir: text("posts_dir").default("source/_posts"),
  mediaDir: text("media_dir").default("source/images"),
  workflowFile: text("workflow_file").default(".github/workflows/deploy.yml"),
  autoDeploy: integer("auto_deploy", { mode: "boolean" }).default(true),
  deployNotifications: integer("deploy_notifications", { mode: "boolean" }).default(true),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

export const pluginStorage = sqliteTable("plugin_storage", {
  userId: text("user_id").notNull(),
  pluginId: text("plugin_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: text("updated_at"),
});

export const pluginSecrets = sqliteTable("plugin_secrets", {
  userId: text("user_id").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at"),
});

export const pluginNetworkAudit = sqliteTable("plugin_network_audit", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  pluginId: text("plugin_id").notNull(),
  url: text("url").notNull(),
  method: text("method").notNull(),
  status: integer("status").notNull(),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});

export const pluginState = sqliteTable("plugin_state", {
  userId: text("user_id").notNull(),
  pluginId: text("plugin_id").notNull(),
  state: text("state").notNull(),
  enabledAt: text("enabled_at"),
  lastError: text("last_error"),
  updatedAt: text("updated_at").notNull(),
});

export const pluginConfig = sqliteTable("plugin_config", {
  userId: text("user_id").notNull(),
  pluginId: text("plugin_id").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
