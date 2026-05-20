import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../context/data-provider-context";
import { queryKeys } from "../lib/query-keys";

export function useTags() {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => dataProvider.getTags(),
  });
}

export function useRenameTag() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { type: "tag" | "category"; name: string; newName: string }) =>
      dataProvider.renameTag(params.type, params.name, params.newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function useDeleteTag() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { type: "tag" | "category"; name: string }) =>
      dataProvider.deleteTag(params.type, params.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function useMergeTag() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { type: "tag" | "category"; name: string; target: string }) =>
      dataProvider.mergeTag(params.type, params.name, params.target),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}
