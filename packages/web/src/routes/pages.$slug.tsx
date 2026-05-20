import { EditPagePage } from "@hexo-cms/ui/pages/pages-edit";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/pages/$slug")({
  component: EditPagePage,
});
