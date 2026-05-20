import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../context/data-provider-context";
import { queryKeys } from "../lib/query-keys";

export function useThemes() {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.themes,
    queryFn: () => dataProvider.getThemes(),
  });
}

export function useSwitchTheme() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (themeName: string) => dataProvider.switchTheme(themeName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.themes });
    },
  });
}
