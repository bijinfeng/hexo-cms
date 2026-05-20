import type {
  HexoPost,
  PluginConfigValue,
  PluginEventHandler,
  PluginStorageAPI,
  PluginStorageJsonValue,
} from "@hexo-cms/core";
import { type DraftIssue, checkDraft } from "./draft-checker";

export interface DraftAlert {
  postPath: string;
  postTitle: string;
  issues: DraftIssue[];
  lastChecked: string;
}

export function createDraftCoachEventHandler(
  getConfig: () => PluginConfigValue,
  storage: PluginStorageAPI,
  t: (key: string, params?: Record<string, string | number>) => string,
): PluginEventHandler {
  return async ({ name, payload }) => {
    if (name !== "post.afterSave") return;

    const config = getConfig();
    if (config.enableNotifications === false) return;

    const post = (payload as { post?: HexoPost } | undefined)?.post;
    if (!post || !post.frontmatter?.draft) {
      if (post?.path) {
        const alerts = (await storage.get("alerts")) as unknown as DraftAlert[] | null;
        if (alerts) {
          const filtered = alerts.filter((a) => a.postPath !== post.path);
          await storage.set("alerts", filtered as unknown as PluginStorageJsonValue);
        }
      }
      return;
    }

    const issues = checkDraft(post, config, t);

    const alerts = ((await storage.get("alerts")) as unknown as DraftAlert[] | null) || [];
    const existingIndex = alerts.findIndex((a) => a.postPath === post.path);

    const alert: DraftAlert = {
      postPath: post.path,
      postTitle: post.title || t("draft.widget.unnamed"),
      issues,
      lastChecked: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      alerts[existingIndex] = alert;
    } else {
      alerts.push(alert);
    }

    await storage.set("alerts", alerts as unknown as PluginStorageJsonValue);
  };
}
