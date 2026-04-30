import { createFileRoute } from "@tanstack/react-router";
import { MediaPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/media")({ component: MediaPage });
