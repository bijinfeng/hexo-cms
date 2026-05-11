import type { GitHubConfig } from "@hexo-cms/core";
import type { RepositoryConfigInput } from "../types/onboarding";

export function toGitHubConfig(input: RepositoryConfigInput): GitHubConfig {
  return {
    owner: input.owner,
    repo: input.repo,
    branch: input.branch,
    postsDir: input.postsDir,
    mediaDir: input.mediaDir,
    workflowFile: input.workflowFile,
    autoDeploy: input.autoDeploy,
    deployNotifications: input.deployNotifications,
  };
}
