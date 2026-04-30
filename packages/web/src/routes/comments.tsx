import { createFileRoute } from "@tanstack/react-router";
import { CommentsPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/comments")({ component: CommentsPage });
