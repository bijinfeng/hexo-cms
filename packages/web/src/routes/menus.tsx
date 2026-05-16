import { createFileRoute } from "@tanstack/react-router";
import { MenusPage } from "@hexo-cms/ui/pages/menus";
export const Route = createFileRoute("/menus")({ component: MenusPage });
