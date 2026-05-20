import type {
  DiagnosticsHandler,
  DiagnosticsIssue,
  HexoPost,
  PluginConfigValue,
} from "@hexo-cms/core";

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
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

export function checkPostSeo(
  post: HexoPost,
  config: PluginConfigValue,
  t: (key: string, params?: Record<string, string | number>) => string,
): DiagnosticsIssue[] {
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
      message: t("seo.diag.missingTitle"),
      hint: t("seo.diag.missingTitleHint"),
    });
  } else {
    if (title.length < minTitleLength) {
      issues.push({
        id: "seo.title.too-short",
        severity: "warn",
        field: "title",
        message: t("seo.diag.titleTooShort", { length: title.length, min: minTitleLength }),
      });
    }
    if (title.length > maxTitleLength) {
      issues.push({
        id: "seo.title.too-long",
        severity: "warn",
        field: "title",
        message: t("seo.diag.titleTooLong", { length: title.length, max: maxTitleLength }),
      });
    }
  }

  if (requireExcerpt && !getExcerpt(post)) {
    issues.push({
      id: "seo.excerpt.missing",
      severity: "warn",
      field: "excerpt",
      message: t("seo.diag.missingExcerpt"),
      hint: t("seo.diag.missingExcerptHint"),
    });
  }

  if (requireCategories && getCategories(post).length === 0) {
    issues.push({
      id: "seo.categories.missing",
      severity: "info",
      field: "categories",
      message: t("seo.diag.missingCategories"),
      hint: t("seo.diag.missingCategoriesHint"),
    });
  }

  if (!getSlug(post)) {
    issues.push({
      id: "seo.slug.missing",
      severity: "warn",
      field: "slug",
      message: t("seo.diag.missingSlug"),
      hint: t("seo.diag.missingSlugHint"),
    });
  }

  return issues;
}

export function createSeoPostDiagnosticsHandler(
  getConfig: () => PluginConfigValue,
  t: (key: string, params?: Record<string, string | number>) => string,
): DiagnosticsHandler {
  return async ({ target }) => {
    if (target.scope !== "post" || !target.post) return [];
    return checkPostSeo(target.post, getConfig(), t);
  };
}

export function createSeoSiteDiagnosticsHandler(
  getConfig: () => PluginConfigValue,
  t: (key: string, params?: Record<string, string | number>) => string,
): DiagnosticsHandler {
  return async ({ content }) => {
    const config = getConfig();
    const posts = await content.getPosts();

    const issues: DiagnosticsIssue[] = [];
    let missingExcerpt = 0;
    let missingCategories = 0;
    let tooShortTitles = 0;

    for (const post of posts) {
      const postIssues = checkPostSeo(post, config, t);
      if (postIssues.some((issue) => issue.id === "seo.excerpt.missing")) missingExcerpt += 1;
      if (postIssues.some((issue) => issue.id === "seo.categories.missing")) missingCategories += 1;
      if (postIssues.some((issue) => issue.id === "seo.title.too-short")) tooShortTitles += 1;
    }

    if (missingExcerpt > 0) {
      issues.push({
        id: "seo.site.missing-excerpt",
        severity: "warn",
        message: t("seo.diag.siteExcerptCount", { count: missingExcerpt }),
      });
    }
    if (missingCategories > 0) {
      issues.push({
        id: "seo.site.missing-categories",
        severity: "info",
        message: t("seo.diag.siteCategoryCount", { count: missingCategories }),
      });
    }
    if (tooShortTitles > 0) {
      issues.push({
        id: "seo.site.short-titles",
        severity: "warn",
        message: t("seo.diag.siteTitleCount", { count: tooShortTitles }),
      });
    }

    return issues;
  };
}
