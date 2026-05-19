import type { DiagnosticsHandler, DiagnosticsIssue, HexoPost, PluginConfigValue } from "@hexo-cms/core";

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function getCategories(post: HexoPost): string[] {
  const raw = post.frontmatter?.categories ?? post.frontmatter?.category;
  if (Array.isArray(raw)) return raw.filter((c): c is string => typeof c === "string");
  if (typeof raw === "string" && raw.trim() !== "") return [raw];
  return [];
}

function getExcerpt(post: HexoPost): string | undefined {
  const excerpt = post.frontmatter?.excerpt ?? post.frontmatter?.description;
  if (typeof excerpt === "string" && excerpt.trim() !== "") return excerpt;
  return undefined;
}

function getSlug(post: HexoPost): string | undefined {
  const slug = post.frontmatter?.slug;
  if (typeof slug === "string" && slug.trim() !== "") return slug;
  return undefined;
}

export function checkPostSeo(post: HexoPost, config: PluginConfigValue): DiagnosticsIssue[] {
  const issues: DiagnosticsIssue[] = [];
  const minTitleLength = parsePositiveInt(config.minTitleLength, 10);
  const maxTitleLength = parsePositiveInt(config.maxTitleLength, 60);
  const requireExcerpt = config.requireExcerpt !== false;
  const requireCategories = config.requireCategories !== false;

  const title = post.title?.trim() ?? "";
  if (!title) {
    issues.push({
      id: "seo.title.missing",
      severity: "error",
      field: "title",
      message: "文章缺少标题",
      hint: "添加一个描述性的标题有助于搜索引擎识别内容",
    });
  } else {
    if (title.length < minTitleLength) {
      issues.push({
        id: "seo.title.too-short",
        severity: "warn",
        field: "title",
        message: `标题过短（${title.length} 字符），建议不少于 ${minTitleLength} 字符`,
      });
    }
    if (title.length > maxTitleLength) {
      issues.push({
        id: "seo.title.too-long",
        severity: "warn",
        field: "title",
        message: `标题过长（${title.length} 字符），建议不超过 ${maxTitleLength} 字符`,
      });
    }
  }

  if (requireExcerpt && !getExcerpt(post)) {
    issues.push({
      id: "seo.excerpt.missing",
      severity: "warn",
      field: "excerpt",
      message: "缺少摘要或描述",
      hint: "在 frontmatter 添加 excerpt 或 description 有助于社交分享和搜索摘要",
    });
  }

  if (requireCategories && getCategories(post).length === 0) {
    issues.push({
      id: "seo.categories.missing",
      severity: "info",
      field: "categories",
      message: "文章未设置分类",
      hint: "设置分类有助于读者浏览相关内容",
    });
  }

  if (!getSlug(post)) {
    issues.push({
      id: "seo.slug.missing",
      severity: "warn",
      field: "slug",
      message: "缺少 slug",
      hint: "显式设置 slug 能让 URL 更稳定",
    });
  }

  return issues;
}

export function createSeoPostDiagnosticsHandler(getConfig: () => PluginConfigValue): DiagnosticsHandler {
  return async ({ target }) => {
    if (target.scope !== "post" || !target.post) return [];
    return checkPostSeo(target.post, getConfig());
  };
}

export function createSeoSiteDiagnosticsHandler(getConfig: () => PluginConfigValue): DiagnosticsHandler {
  return async ({ content }) => {
    const config = getConfig();
    const posts = await content.getPosts();

    const issues: DiagnosticsIssue[] = [];
    let missingExcerpt = 0;
    let missingCategories = 0;
    let tooShortTitles = 0;

    for (const post of posts) {
      const postIssues = checkPostSeo(post, config);
      if (postIssues.some((issue) => issue.id === "seo.excerpt.missing")) missingExcerpt += 1;
      if (postIssues.some((issue) => issue.id === "seo.categories.missing")) missingCategories += 1;
      if (postIssues.some((issue) => issue.id === "seo.title.too-short")) tooShortTitles += 1;
    }

    if (missingExcerpt > 0) {
      issues.push({
        id: "seo.site.missing-excerpt",
        severity: "warn",
        message: `有 ${missingExcerpt} 篇文章缺少摘要`,
      });
    }
    if (missingCategories > 0) {
      issues.push({
        id: "seo.site.missing-categories",
        severity: "info",
        message: `有 ${missingCategories} 篇文章未设置分类`,
      });
    }
    if (tooShortTitles > 0) {
      issues.push({
        id: "seo.site.short-titles",
        severity: "warn",
        message: `有 ${tooShortTitles} 篇文章标题过短`,
      });
    }

    return issues;
  };
}
