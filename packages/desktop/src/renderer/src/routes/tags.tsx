import { createFileRoute } from "@tanstack/react-router";
import { TagsPage } from "@hexo-cms/ui/pages/tags";

export const Route = createFileRoute("/tags")({
  component: TagsPage,
});
