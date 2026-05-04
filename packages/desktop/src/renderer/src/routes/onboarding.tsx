import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@hexo-cms/ui";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });
