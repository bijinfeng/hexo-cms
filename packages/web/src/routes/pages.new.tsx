import { createFileRoute } from "@tanstack/react-router";
import { NewPagePage } from "@hexo-cms/ui";

export const Route = createFileRoute("/pages/new")({
  component: NewPagePage,
});
