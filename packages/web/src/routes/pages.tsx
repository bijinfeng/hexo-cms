import { createFileRoute } from "@tanstack/react-router";
import { PagesPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/pages")({ component: PagesPage });
