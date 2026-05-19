import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../context/data-provider-context";
import { queryKeys } from "../lib/query-keys";

export function useMediaFiles() {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.media,
    queryFn: () => dataProvider.getMediaFiles(),
  });
}

export function useUploadMedia() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { file: File; path: string }) =>
      dataProvider.uploadMedia(params.file, params.path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media });
    },
  });
}

export function useDeleteMedia() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (path: string) => dataProvider.deleteMedia(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media });
    },
  });
}
