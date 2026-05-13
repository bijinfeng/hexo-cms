import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@hexo-cms/ui/pages/dashboard";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
