import { createFileRoute } from "@tanstack/react-router";
import { CommentsPage } from "@hexo-cms/plugin-comments-overview/pages/comments";

export const Route = createFileRoute("/comments")({
  component: CommentsPage,
});
