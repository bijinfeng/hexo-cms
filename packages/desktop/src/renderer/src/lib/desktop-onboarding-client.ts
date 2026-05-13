import { requireElectronAPI } from "@hexo-cms/ui/lib/electron-api";
import { toGitHubConfig } from "@hexo-cms/ui/lib/repository-config";
import type { OnboardingClient } from "@hexo-cms/ui/types/onboarding";
import { desktopAuthClient } from "./desktop-auth-client";
import { desktopDataProvider } from "./desktop-data-provider-instance";

export const desktopOnboardingClient: OnboardingClient = {
  async getCurrentUser() {
    const session = await requireElectronAPI().getSession();
    return {
      login: session.user?.login ?? session.user?.email ?? "github",
      name: session.user?.name,
      avatarUrl: session.user?.avatarUrl,
    };
  },

  async reauthorize() {
    return desktopAuthClient.reauthorize();
  },

  getAuthSession() {
    return desktopAuthClient.getSession();
  },

  listRepositories(input) {
    return requireElectronAPI().listOnboardingRepositories(input);
  },

  validateRepository(input) {
    return requireElectronAPI().validateOnboardingRepository(input);
  },

  async saveRepositoryConfig(input) {
    await desktopDataProvider.saveConfig(toGitHubConfig(input));
  },
};
