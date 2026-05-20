import type { HexoPost } from "@hexo-cms/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../context/data-provider-context";
import { queryKeys } from "../lib/query-keys";

export function usePages(options: { enabled?: boolean } = {}) {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.pages.all,
    queryFn: () => dataProvider.getPages(),
    enabled: options.enabled ?? true,
  });
}

export function usePage(path: string) {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.pages.detail(path),
    queryFn: () => dataProvider.getPage(path),
    enabled: !!path,
  });
}

export function useSavePage() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (page: HexoPost) => dataProvider.savePage(page),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });
}

export function useDeletePage() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (path: string) => dataProvider.deletePage(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });
    },
  });
}
