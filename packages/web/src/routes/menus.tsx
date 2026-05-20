import { MenusPage } from "@hexo-cms/ui/pages/menus";
import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/menus")({ component: MenusPage });
