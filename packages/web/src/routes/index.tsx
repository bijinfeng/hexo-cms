import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/")({ component: DashboardPage });
