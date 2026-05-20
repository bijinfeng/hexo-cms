import { ThemesPage } from "@hexo-cms/ui/pages/themes";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/themes")({ component: ThemesPage });
