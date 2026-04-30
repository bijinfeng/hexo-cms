import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@hexo-cms/ui";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});
