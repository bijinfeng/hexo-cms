import { DashboardPage } from "@hexo-cms/ui/pages/dashboard";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({ component: DashboardPage });
