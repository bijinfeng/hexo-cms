import {
  toGitHubConfig,
  type OnboardingClient,
  type OnboardingUser,
  type RepositoryConfigInput,
  type RepositoryOption,
  type RepositoryValidation,
  type RepositoryValidationError,
} from "@hexo-cms/ui";
import { authClient, webAuthClient } from "./auth-client";
import { webDataProvider } from "./web-data-provider-instance";

const REPOSITORY_VALIDATION_ERRORS = new Set<RepositoryValidationError>([
  "REPO_NOT_FOUND",
  "PERMISSION_REQUIRED",
  "BRANCH_NOT_FOUND",
  "NOT_HEXO_REPO",
  "NETWORK_ERROR",
  "REAUTH_REQUIRED",
]);

async function assertOk(response: Response, operation: string): Promise<Response> {
  if (response.ok) return response;
  throw new Error(`${operation} failed`);
}

function toValidationError(error: unknown): RepositoryValidationError | null {
  if (typeof error !== "string") return null;
  return REPOSITORY_VALIDATION_ERRORS.has(error as RepositoryValidationError)
    ? error as RepositoryValidationError
    : null;
}

export const webOnboardingClient: OnboardingClient = {
  async getCurrentUser(): Promise<OnboardingUser> {
    const session = await authClient.getSession();
    const user = session.data?.user;
    return {
      login: user?.email ?? user?.name ?? "github",
      name: user?.name,
      avatarUrl: user?.image,
    };
  },

  async reauthorize(): Promise<void> {
    await webAuthClient.reauthorize();
  },

  async listRepositories(input): Promise<RepositoryOption[]> {
    const query = input.query ? `?q=${encodeURIComponent(input.query)}` : "";
    const response = await assertOk(
      await fetch(`/api/onboarding/repositories${query}`),
      "list repositories",
    );
    const data = await response.json() as { repositories?: RepositoryOption[] };
    return data.repositories ?? [];
  },

  async validateRepository(input): Promise<RepositoryValidation> {
    const response = await fetch("/api/onboarding/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json() as {
      error?: unknown;
      validation?: RepositoryValidation;
    };
    if (data.validation) return data.validation;
    const error = toValidationError(data.error);
    if (error) return { ok: false, checks: [], error };
    throw new Error("validate repository failed");
  },

  async saveRepositoryConfig(input: RepositoryConfigInput): Promise<void> {
    await webDataProvider.saveConfig(toGitHubConfig(input));
  },
};
