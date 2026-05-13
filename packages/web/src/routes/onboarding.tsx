import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@hexo-cms/ui/pages/onboarding";
import { webOnboardingClient } from "../lib/onboarding-client";

function WebOnboardingRoute() {
  return <OnboardingPage onboardingClient={webOnboardingClient} />;
}

export const Route = createFileRoute("/onboarding")({ component: WebOnboardingRoute });
