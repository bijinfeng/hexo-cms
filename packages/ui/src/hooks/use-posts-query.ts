import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../context/data-provider-context";
import { queryKeys } from "../lib/query-keys";
import type { HexoPost } from "@hexo-cms/core";

export function usePosts(options: { enabled?: boolean } = {}) {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.posts.all,
    queryFn: () => dataProvider.getPosts(),
    enabled: options.enabled ?? true,
  });
}

export function usePost(path: string) {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.posts.detail(path),
    queryFn: () => dataProvider.getPost(path),
    enabled: !!path,
  });
}

export function useSavePost() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (post: HexoPost) => dataProvider.savePost(post),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });
}

export function useDeletePost() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (path: string) => dataProvider.deletePost(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.all });
    },
  });
}
