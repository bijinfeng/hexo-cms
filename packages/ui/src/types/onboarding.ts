export interface OnboardingUser {
  login: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface RepositoryListInput {
  query?: string;
}

export interface RepositoryOption {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  pushedAt?: string | null;
  permissions: {
    push: boolean;
  };
}

export interface RepositorySelection {
  owner: string;
  repo: string;
  branch?: string;
}

export type RepositoryValidationCheckId = "access" | "permission" | "branch" | "hexo";

export type RepositoryValidationError =
  | "REPO_NOT_FOUND"
  | "PERMISSION_REQUIRED"
  | "BRANCH_NOT_FOUND"
  | "NOT_HEXO_REPO"
  | "NETWORK_ERROR"
  | "REAUTH_REQUIRED";

export interface RepositoryValidationCheck {
  id: RepositoryValidationCheckId;
  status: "success" | "error";
  message: string;
}

export interface RepositoryConfigInput {
  owner: string;
  repo: string;
  branch: string;
  postsDir: string;
  mediaDir: string;
  workflowFile: string;
  autoDeploy: boolean;
  deployNotifications: boolean;
}

export interface RepositoryValidation {
  ok: boolean;
  repository?: RepositoryOption;
  defaultConfig?: RepositoryConfigInput;
  checks: RepositoryValidationCheck[];
  error?: RepositoryValidationError;
}

export interface OnboardingClient {
  getCurrentUser: () => Promise<OnboardingUser>;
  reauthorize: () => Promise<void>;
  listRepositories: (input: RepositoryListInput) => Promise<RepositoryOption[]>;
  validateRepository: (input: RepositorySelection) => Promise<RepositoryValidation>;
  saveRepositoryConfig: (input: RepositoryConfigInput) => Promise<void>;
}
