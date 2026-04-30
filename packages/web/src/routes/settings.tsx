import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/settings")({ component: SettingsPage });
