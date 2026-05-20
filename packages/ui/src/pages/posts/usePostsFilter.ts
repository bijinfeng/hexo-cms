import { useMemo, useState } from "react";
import { usePosts } from "../../hooks/use-posts-query";
import { useI18n } from "../../i18n/I18nProvider";

export interface DateRangeOption {
  label: string;
  value: string;
}

export interface PostDisplayItem {
  id: string;
  title: string;
  slug: string;
  path: string;
  date: string;
  status: "published" | "draft" | "archived";
  views: number;
  tags: string[];
  category: string;
  excerpt: string;
}

export function usePostsFilter(options: { enabled?: boolean } = {}) {
  const { t } = useI18n();
  const query = usePosts({ enabled: options.enabled });

  const statusConfig = useMemo(
    () => ({
      published: { label: t("posts.filter.published"), variant: "success" as const },
      draft: { label: t("posts.filter.draft"), variant: "default" as const },
      archived: { label: t("posts.filter.archived"), variant: "warning" as const },
    }),
    [t],
  );

  const filterOptions = useMemo(
    () => [
      t("posts.filter.all"),
      t("posts.filter.published"),
      t("posts.filter.draft"),
      t("posts.filter.archived"),
    ],
    [t],
  );

  const dateRangeOptions = useMemo<DateRangeOption[]>(
    () => [
      { label: t("posts.filter.allTime"), value: "all" },
      { label: t("posts.filter.last7Days"), value: "7" },
      { label: t("posts.filter.last30Days"), value: "30" },
      { label: t("posts.filter.last90Days"), value: "90" },
    ],
    [t],
  );

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(t("posts.filter.all"));
  const [selectedCategory, setSelectedCategory] = useState(t("posts.filter.allCategories"));
  const [dateRange, setDateRange] = useState("all");

  const posts = useMemo<PostDisplayItem[]>(() => {
    if (!query.data) return [];
    return query.data.map((post, index: number) => ({
      id: String(index + 1),
      title: post.title,
      slug: post.path.replace(/^.*\//, "").replace(/\.md$/, ""),
      path: post.path,
      date: post.date || new Date().toISOString().split("T")[0],
      status: (post.frontmatter?.draft ? "draft" : "published") as
        | "published"
        | "draft"
        | "archived",
      views: 0,
      tags: Array.isArray(post.frontmatter?.tags) ? (post.frontmatter.tags as string[]) : [],
      category:
        typeof post.frontmatter?.category === "string"
          ? post.frontmatter.category
          : t("posts.filter.uncategorized"),
      excerpt: `${(post.content || "").slice(0, 100)}...`,
    }));
  }, [query.data]);

  const loading = query.isPending;
  const error = query.error?.message ?? "";

  const allCategories = useMemo(
    () => [t("posts.filter.allCategories"), ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts, t],
  );

  const hasActiveFilters = useMemo(
    () =>
      search !== "" ||
      activeFilter !== t("posts.filter.all") ||
      selectedCategory !== t("posts.filter.allCategories") ||
      dateRange !== "all",
    [search, activeFilter, selectedCategory, dateRange, t],
  );

  const clearAllFilters = () => {
    setSearch("");
    setActiveFilter(t("posts.filter.all"));
    setSelectedCategory(t("posts.filter.allCategories"));
    setDateRange("all");
  };

  const filtered = useMemo(
    () =>
      posts.filter((p) => {
        const matchSearch =
          !search ||
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())) ||
          p.excerpt.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase());

        const matchFilter =
          activeFilter === t("posts.filter.all") ||
          (activeFilter === t("posts.filter.published") && p.status === "published") ||
          (activeFilter === t("posts.filter.draft") && p.status === "draft") ||
          (activeFilter === t("posts.filter.archived") && p.status === "archived");

        const matchCategory =
          selectedCategory === t("posts.filter.allCategories") || p.category === selectedCategory;

        const matchDateRange = (() => {
          if (dateRange === "all") return true;
          const postDate = new Date(p.date);
          const cutoffDate = new Date(
            Date.now() - Number.parseInt(dateRange, 10) * 24 * 60 * 60 * 1000,
          );
          return postDate >= cutoffDate;
        })();

        return matchSearch && matchFilter && matchCategory && matchDateRange;
      }),
    [posts, search, activeFilter, selectedCategory, dateRange, t],
  );

  return {
    posts,
    loading,
    error,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    selectedCategory,
    setSelectedCategory,
    dateRange,
    setDateRange,
    allCategories,
    hasActiveFilters,
    clearAllFilters,
    filtered,
    loadPosts: () => query.refetch().then(() => undefined),
    statusConfig,
    filterOptions,
    dateRangeOptions,
  };
}
