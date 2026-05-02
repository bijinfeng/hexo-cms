import { createRootRoute, Outlet } from "@tanstack/react-router";
import { CMSLayout, DataProviderProvider } from "@hexo-cms/ui";
import { DesktopDataProvider } from "../lib/desktop-data-provider";

const desktopDataProvider = new DesktopDataProvider();

export const Route = createRootRoute({
  component: () => (
    <DataProviderProvider provider={desktopDataProvider}>
      <CMSLayout isElectron>
        <Outlet />
      </CMSLayout>
    </DataProviderProvider>
  ),
});
