import type { DataProvider, HexoPost, PluginEventName } from "@hexo-cms/core";

type DeployRun = Awaited<ReturnType<DataProvider["getDeployments"]>>[number];
type DeployStatusSnapshot = Pick<DeployRun, "status" | "conclusion">;

export type PluginEventEmitter = <TPayload>(eventName: PluginEventName, payload: TPayload) => Promise<unknown>;

export function withPluginEvents(provider: DataProvider, emitEvent: PluginEventEmitter): DataProvider {
  const deploymentStatuses = new Map<string, DeployStatusSnapshot>();
  let deploymentsHydrated = false;

  return {
    ...provider,

    async savePost(post: HexoPost): Promise<void> {
      await provider.savePost(post);
      await emitEvent("post.afterSave", {
        path: post.path,
        title: post.title,
        draft: post.frontmatter.draft === true,
        post,
      });
    },

    async deletePost(path: string): Promise<void> {
      await provider.deletePost(path);
      await emitEvent("post.afterDelete", { path });
    },

    async savePage(page: HexoPost): Promise<void> {
      await provider.savePage(page);
      await emitEvent("page.afterSave", {
        path: page.path,
        title: page.title,
        page,
      });
    },

    async deletePage(path: string): Promise<void> {
      await provider.deletePage(path);
      await emitEvent("page.afterDelete", { path });
    },

    async uploadMedia(file: File, path: string): Promise<{ url: string }> {
      const result = await provider.uploadMedia(file, path);
      await emitEvent("media.afterUpload", {
        path,
        name: file.name,
        size: file.size,
        type: file.type,
        url: result.url,
      });
      return result;
    },

    async deleteMedia(path: string): Promise<void> {
      await provider.deleteMedia(path);
      await emitEvent("media.afterDelete", { path });
    },

    async getDeployments(): Promise<DeployRun[]> {
      const deployments = await provider.getDeployments();
      await emitDeploymentStatusChanges(deployments, deploymentStatuses, deploymentsHydrated, emitEvent);
      deploymentsHydrated = true;
      return deployments;
    },

    async triggerDeploy(workflowFile: string): Promise<void> {
      await provider.triggerDeploy(workflowFile);
      await emitEvent("deploy.afterTrigger", { workflowFile });
    },
  };
}

async function emitDeploymentStatusChanges(
  deployments: DeployRun[],
  previousStatuses: Map<string, DeployStatusSnapshot>,
  hydrated: boolean,
  emitEvent: PluginEventEmitter,
): Promise<void> {
  const changes: Array<Promise<unknown>> = [];

  deployments.forEach((deployment) => {
    const previousStatus = previousStatuses.get(deployment.id);
    previousStatuses.set(deployment.id, {
      status: deployment.status,
      conclusion: deployment.conclusion,
    });

    if (
      hydrated &&
      previousStatus &&
      (previousStatus.status !== deployment.status || previousStatus.conclusion !== deployment.conclusion)
    ) {
      changes.push(
        emitEvent("deploy.statusChange", {
          id: deployment.id,
          status: deployment.status,
          conclusion: deployment.conclusion,
          previousStatus: previousStatus.status,
          previousConclusion: previousStatus.conclusion,
          createdAt: deployment.createdAt,
          duration: deployment.duration,
        }),
      );
    }
  });

  await Promise.all(changes);
}
