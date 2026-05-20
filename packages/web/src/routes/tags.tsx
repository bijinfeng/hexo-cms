import { TagsPage } from "@hexo-cms/ui/pages/tags";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/tags")({ component: TagsPage });
