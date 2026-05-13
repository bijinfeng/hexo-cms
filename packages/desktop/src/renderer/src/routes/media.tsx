import { createFileRoute } from "@tanstack/react-router";
import { MediaPage } from "@hexo-cms/ui/pages/media";

export const Route = createFileRoute("/media")({
  component: MediaPage,
});
