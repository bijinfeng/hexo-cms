import { requireElectronAPI, toGitHubConfig, type OnboardingClient } from "@hexo-cms/ui";
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
    await desktopAuthClient.reauthorize();
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
