import { createFileRoute } from "@tanstack/react-router";
import { ThemesPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/themes")({ component: ThemesPage });
