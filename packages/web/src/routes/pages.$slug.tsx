import { createFileRoute } from "@tanstack/react-router";
import { EditPagePage } from "@hexo-cms/ui";

export const Route = createFileRoute("/pages/$slug")({
  component: EditPagePage,
});
