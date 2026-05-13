import { createFileRoute } from "@tanstack/react-router";
import { NewPostPage } from "@hexo-cms/ui/pages/posts-new";
export const Route = createFileRoute("/posts/new")({ component: NewPostPage });
