import type { HexoPost, PluginConfigValue, PluginEventHandler, PluginStorageAPI, PluginStorageJsonValue } from "@hexo-cms/core";
import { checkDraft, type DraftIssue } from "./draft-checker";

export interface DraftAlert {
  postPath: string;
  postTitle: string;
  issues: DraftIssue[];
  lastChecked: string;
}

export function createDraftCoachEventHandler(
  getConfig: () => PluginConfigValue,
  storage: PluginStorageAPI,
): PluginEventHandler {
  return async ({ name, payload }) => {
    if (name !== "post.afterSave") return;

    const config = getConfig();
    if (config.enableNotifications === false) return;

    const post = (payload as { post?: HexoPost } | undefined)?.post;
    if (!post || !post.frontmatter?.draft) {
      // 如果不是草稿，清除该文章的提醒
      if (post?.path) {
        const alerts = (await storage.get("alerts")) as unknown as DraftAlert[] | null;
        if (alerts) {
          const filtered = alerts.filter((a) => a.postPath !== post.path);
          await storage.set("alerts", filtered as unknown as PluginStorageJsonValue);
        }
      }
      return;
    }

    // 检查草稿问题
    const issues = checkDraft(post, config);

    // 更新或添加提醒
    const alerts = ((await storage.get("alerts")) as unknown as DraftAlert[] | null) || [];
    const existingIndex = alerts.findIndex((a) => a.postPath === post.path);

    const alert: DraftAlert = {
      postPath: post.path,
      postTitle: post.title || "未命名草稿",
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
