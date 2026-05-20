import { NewPostPage } from "@hexo-cms/ui/pages/posts-new";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/posts/new")({ component: NewPostPage });
