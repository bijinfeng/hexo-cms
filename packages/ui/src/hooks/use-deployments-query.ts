import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDataProvider } from "../context/data-provider-context";
import { queryKeys } from "../lib/query-keys";

export function useDeployments() {
  const dataProvider = useDataProvider();

  return useQuery({
    queryKey: queryKeys.deployments,
    queryFn: () => dataProvider.getDeployments(),
  });
}

export function useTriggerDeploy() {
  const dataProvider = useDataProvider();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workflowFile: string) => dataProvider.triggerDeploy(workflowFile),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.deployments });
      }, 3000);
    },
  });
}
