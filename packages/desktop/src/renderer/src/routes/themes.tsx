import { createFileRoute } from "@tanstack/react-router";
import { ThemesPage } from "@hexo-cms/ui/pages/themes";

export const Route = createFileRoute("/themes")({
  component: ThemesPage,
});
