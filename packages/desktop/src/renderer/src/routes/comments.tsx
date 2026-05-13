import { createFileRoute } from "@tanstack/react-router";
import { CommentsPage } from "@hexo-cms/ui/pages/comments";

export const Route = createFileRoute("/comments")({
  component: CommentsPage,
});
