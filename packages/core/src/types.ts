export interface GitHubConfig {
  owner: string;
  repo: string;
  branch?: string;
  postsDir?: string;
  mediaDir?: string;
}

export interface HexoPost {
  path: string;
  title: string;
  date: string;
  content: string;
  frontmatter: Record<string, any>;
}

export interface GitHubRepoConfig extends GitHubConfig {
  workflowFile?: string;
  autoDeploy?: boolean;
  deployNotifications?: boolean;
}
