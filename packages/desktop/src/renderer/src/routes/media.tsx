import { MediaPage } from "@hexo-cms/ui/pages/media";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/media")({ component: MediaPage });
