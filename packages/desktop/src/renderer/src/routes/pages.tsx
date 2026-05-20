import { PagesPage } from "@hexo-cms/ui/pages/pages";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/pages")({ component: PagesPage });
