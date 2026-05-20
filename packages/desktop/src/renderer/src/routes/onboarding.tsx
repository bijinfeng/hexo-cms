import { OnboardingPage } from "@hexo-cms/ui/pages/onboarding";
import { createFileRoute } from "@tanstack/react-router";
import { desktopOnboardingClient } from "../lib/desktop-onboarding-client";

function DesktopOnboardingRoute() {
  return <OnboardingPage onboardingClient={desktopOnboardingClient} />;
}

export const Route = createFileRoute("/onboarding")({ component: DesktopOnboardingRoute });
