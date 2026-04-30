import { createFileRoute } from "@tanstack/react-router";
import { TagsPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/tags")({ component: TagsPage });
