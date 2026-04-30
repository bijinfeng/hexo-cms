import { createRootRoute, Outlet } from "@tanstack/react-router";
import { CMSLayout } from "@hexo-cms/ui";

export const Route = createRootRoute({
  component: () => (
    <CMSLayout>
      <Outlet />
    </CMSLayout>
  ),
});
