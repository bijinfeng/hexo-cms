import { useMemo, useState } from "react";
import { usePosts } from "../../hooks/use-posts-query";

export const statusConfig = {
  published: { label: "已发布", variant: "success" as const },
  draft: { label: "草稿", variant: "default" as const },
  archived: { label: "已归档", variant: "warning" as const },
};

export const filterOptions = ["全部", "已发布", "草稿", "已归档"];

export const dateRangeOptions = [
  { label: "全部时间", value: "all" },
  { label: "最近 7 天", value: "7" },
  { label: "最近 30 天", value: "30" },
  { label: "最近 90 天", value: "90" },
];

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
  const query = usePosts({ enabled: options.enabled });
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("全部");
  const [selectedCategory, setSelectedCategory] = useState("全部分类");
  const [dateRange, setDateRange] = useState("all");

  const posts = useMemo<PostDisplayItem[]>(() => {
    if (!query.data) return [];
    return query.data.map((post, index: number) => ({
      id: String(index + 1),
      title: post.title,
      slug: post.path.replace(/^.*\//, "").replace(/\.md$/, ""),
      path: post.path,
      date: post.date || new Date().toISOString().split("T")[0],
      status: (post.frontmatter?.draft ? "draft" : "published") as "published" | "draft" | "archived",
      views: 0,
      tags: Array.isArray(post.frontmatter?.tags) ? post.frontmatter.tags as string[] : [],
      category: typeof post.frontmatter?.category === "string" ? post.frontmatter.category : "未分类",
      excerpt: (post.content || "").slice(0, 100) + "...",
    }));
  }, [query.data]);

  const loading = query.isPending;
  const error = query.error?.message ?? "";

  const allCategories = useMemo(
    () => ["全部分类", ...Array.from(new Set(posts.map((p) => p.category)))],
    [posts],
  );

  const hasActiveFilters = useMemo(
    () => search !== "" || activeFilter !== "全部" || selectedCategory !== "全部分类" || dateRange !== "all",
    [search, activeFilter, selectedCategory, dateRange],
  );

  const clearAllFilters = () => {
    setSearch("");
    setActiveFilter("全部");
    setSelectedCategory("全部分类");
    setDateRange("all");
  };

  const filtered = useMemo(() => posts.filter((p) => {
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase())) ||
      p.excerpt.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    const matchFilter =
      activeFilter === "全部" ||
      (activeFilter === "已发布" && p.status === "published") ||
      (activeFilter === "草稿" && p.status === "draft") ||
      (activeFilter === "已归档" && p.status === "archived");

    const matchCategory = selectedCategory === "全部分类" || p.category === selectedCategory;

    const matchDateRange = (() => {
      if (dateRange === "all") return true;
      const postDate = new Date(p.date);
      const cutoffDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000);
      return postDate >= cutoffDate;
    })();

    return matchSearch && matchFilter && matchCategory && matchDateRange;
  }), [posts, search, activeFilter, selectedCategory, dateRange]);

  return {
    posts, loading, error,
    search, setSearch,
    activeFilter, setActiveFilter,
    selectedCategory, setSelectedCategory,
    dateRange, setDateRange,
    allCategories, hasActiveFilters, clearAllFilters,
    filtered,
    loadPosts: () => query.refetch().then(() => undefined),
  };
}
