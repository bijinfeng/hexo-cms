import { CommentsPage } from "@hexo-cms/plugin-comments-overview/pages/comments";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/comments")({ component: CommentsPage });
