import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../context/data-provider-context";
import { queryKeys } from "../lib/query-keys";

export function useDashboard() {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: async () => {
      const config = await dataProvider.getConfig();
      const [statsData, tagsData, postsData] = await Promise.all([
        dataProvider.getStats(),
        dataProvider.getTags(),
        dataProvider.getPosts(),
      ]);
      return {
        stats: {
          totalPosts: statsData.totalPosts,
          publishedPosts: statsData.publishedPosts,
          draftPosts: statsData.draftPosts,
          totalTags: tagsData.tags.length,
          totalCategories: tagsData.categories.length,
        },
        recentPosts: postsData
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)
          .map((post) => ({
            title: post.title,
            slug: post.path.replace(/^source\/_posts\//, "").replace(/\.md$/, ""),
            date: post.date,
            status: post.frontmatter?.draft ? "draft" : "published",
          })),
        repoInfo: config ? `${config.owner}/${config.repo}` : "",
      };
    },
  });
}

export function useConfig() {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.config,
    queryFn: () => dataProvider.getConfig(),
  });
}

export function useSaveConfig() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: dataProvider.saveConfig.bind(dataProvider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.config });
    },
  });
}
