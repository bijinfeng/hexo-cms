import { createFileRoute } from "@tanstack/react-router";
import { NewPagePage } from "@hexo-cms/ui/pages/pages-new";

export const Route = createFileRoute("/pages/new")({
  component: NewPagePage,
});
