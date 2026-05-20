import { NewPagePage } from "@hexo-cms/ui/pages/pages-new";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/pages/new")({
  component: NewPagePage,
});
