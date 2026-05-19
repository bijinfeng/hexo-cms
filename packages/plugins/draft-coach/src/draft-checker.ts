import type { HexoPost, PluginConfigValue } from "@hexo-cms/core";

export interface DraftIssue {
  id: string;
  type: "overdue" | "word-count" | "cover" | "info";
  severity: "warn" | "info";
  message: string;
  hint?: string;
}

export interface DraftStats {
  totalDrafts: number;
  overdueDrafts: number;
  belowTargetDrafts: number;
  missingCoverDrafts: number;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function getDaysOld(dateString: string): number {
  const postDate = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - postDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function countWords(content: string): number {
  // 简单的字数统计：中文字符 + 英文单词
  const chineseChars = (content.match(/[一-龥]/g) || []).length;
  const englishWords = content
    .replace(/[一-龥]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  return chineseChars + englishWords;
}

export function checkDraft(post: HexoPost, config: PluginConfigValue): DraftIssue[] {
  const issues: DraftIssue[] = [];

  // 只检查草稿
  if (!post.frontmatter?.draft) {
    return issues;
  }

  const draftAgeThreshold = parsePositiveInt(config.draftAgeThreshold, 7);
  const wordCountTarget = parsePositiveInt(config.wordCountTarget, 800);
  const requireCover = config.requireCover !== false;

  // 检查草稿超期
  const daysOld = getDaysOld(post.date);
  if (daysOld > draftAgeThreshold) {
    issues.push({
      id: "draft.overdue",
      type: "overdue",
      severity: "warn",
      message: `草稿已创建 ${daysOld} 天，超过阈值 ${draftAgeThreshold} 天`,
      hint: "考虑完成并发布，或删除不再需要的草稿",
    });
  }

  // 检查字数
  const wordCount = countWords(post.content);
  if (wordCount < wordCountTarget) {
    issues.push({
      id: "draft.word-count",
      type: "word-count",
      severity: "info",
      message: `当前字数 ${wordCount}，目标 ${wordCountTarget}`,
      hint: `还需 ${wordCountTarget - wordCount} 字`,
    });
  }

  // 检查封面图
  if (requireCover) {
    const cover = post.frontmatter?.cover;
    if (!cover || (typeof cover === "string" && cover.trim() === "")) {
      issues.push({
        id: "draft.cover",
        type: "cover",
        severity: "info",
        message: "缺少封面图",
        hint: "在 frontmatter 添加 cover 字段",
      });
    }
  }

  return issues;
}

export function calculateDraftStats(posts: HexoPost[], config: PluginConfigValue): DraftStats {
  const draftAgeThreshold = parsePositiveInt(config.draftAgeThreshold, 7);
  const wordCountTarget = parsePositiveInt(config.wordCountTarget, 800);
  const requireCover = config.requireCover !== false;

  const drafts = posts.filter((p) => p.frontmatter?.draft);

  const stats: DraftStats = {
    totalDrafts: drafts.length,
    overdueDrafts: 0,
    belowTargetDrafts: 0,
    missingCoverDrafts: 0,
  };

  for (const draft of drafts) {
    const daysOld = getDaysOld(draft.date);
    if (daysOld > draftAgeThreshold) {
      stats.overdueDrafts += 1;
    }

    const wordCount = countWords(draft.content);
    if (wordCount < wordCountTarget) {
      stats.belowTargetDrafts += 1;
    }

    if (requireCover) {
      const cover = draft.frontmatter?.cover;
      if (!cover || (typeof cover === "string" && cover.trim() === "")) {
        stats.missingCoverDrafts += 1;
      }
    }
  }

  return stats;
}
