import type {
  RepositoryConfigInput,
  RepositoryListInput,
  RepositoryOption,
  RepositorySelection,
  RepositoryValidation,
} from "@hexo-cms/core";
import type { AuthSession } from "./auth";

export type {
  RepositoryConfigInput,
  RepositoryListInput,
  RepositoryOption,
  RepositorySelection,
  RepositoryValidation,
  RepositoryValidationCheck,
  RepositoryValidationCheckId,
  RepositoryValidationError,
} from "@hexo-cms/core";

export interface OnboardingUser {
  login: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface OnboardingClient {
  getCurrentUser: () => Promise<OnboardingUser>;
  getAuthSession?: () => Promise<AuthSession>;
  reauthorize: () => Promise<AuthSession | undefined>;
  listRepositories: (input: RepositoryListInput) => Promise<RepositoryOption[]>;
  validateRepository: (input: RepositorySelection) => Promise<RepositoryValidation>;
  saveRepositoryConfig: (input: RepositoryConfigInput) => Promise<void>;
}
