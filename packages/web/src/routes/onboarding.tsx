import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@hexo-cms/ui";
import type { OnboardingClient } from "@hexo-cms/ui";

const temporaryWebOnboardingClient: OnboardingClient = {
  async getCurrentUser() {
    return { login: "github" };
  },
  async reauthorize() {
    return;
  },
  async listRepositories() {
    return [];
  },
  async validateRepository() {
    return { ok: false, checks: [], error: "NETWORK_ERROR" };
  },
  async saveRepositoryConfig() {
    return;
  },
};

function WebOnboardingRoute() {
  return <OnboardingPage onboardingClient={temporaryWebOnboardingClient} />;
}

export const Route = createFileRoute("/onboarding")({ component: WebOnboardingRoute });
