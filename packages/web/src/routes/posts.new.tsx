import { createFileRoute } from "@tanstack/react-router";
import { NewPostPage } from "@hexo-cms/ui";
export const Route = createFileRoute("/posts/new")({ component: NewPostPage });
