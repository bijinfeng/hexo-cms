import { createFileRoute } from "@tanstack/react-router";
import { PagesPage } from "@hexo-cms/ui/pages/pages";
export const Route = createFileRoute("/pages")({ component: PagesPage });
