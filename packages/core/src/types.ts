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
  frontmatter: Frontmatter;
}

export interface GitHubRepoConfig extends GitHubConfig {
  workflowFile?: string;
  autoDeploy?: boolean;
  deployNotifications?: boolean;
}

export interface Frontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  categories?: string[];
  category?: string;
  draft?: boolean;
  slug?: string;
  description?: string;
  cover?: string;
  [key: string]: unknown;
}

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  path: string;
  date: string;
  status: "published" | "draft" | "archived";
  tags: string[];
  category: string;
}

export interface DeployRun {
  id: string;
  status: "success" | "failed" | "running" | "pending";
  createdAt: string;
  duration: number;
  conclusion: string;
}

export interface TagItem {
  id: string;
  name: string;
  slug: string;
  count: number;
  color?: string;
}

export interface MediaItem {
  name: string;
  path: string;
  url: string;
  size?: number;
  sha?: string;
}

export enum DataProviderErrorCode {
  NETWORK = "NETWORK_ERROR",
  AUTH = "AUTH_ERROR",
  NOT_FOUND = "NOT_FOUND",
  RATE_LIMIT = "RATE_LIMIT",
  VALIDATION = "VALIDATION",
  UNKNOWN = "UNKNOWN",
}

export class DataProviderError extends Error {
  constructor(
    message: string,
    public code: DataProviderErrorCode,
    public statusCode?: number,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "DataProviderError";
  }

  static isAuthError(error: unknown): boolean {
    return error instanceof DataProviderError && error.code === DataProviderErrorCode.AUTH;
  }

  static isRateLimit(error: unknown): boolean {
    return error instanceof DataProviderError && error.code === DataProviderErrorCode.RATE_LIMIT;
  }

  static isNotFound(error: unknown): boolean {
    return error instanceof DataProviderError && error.code === DataProviderErrorCode.NOT_FOUND;
  }

  static isNetworkError(error: unknown): boolean {
    return error instanceof DataProviderError && error.code === DataProviderErrorCode.NETWORK;
  }
}
