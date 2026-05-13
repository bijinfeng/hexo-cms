import { withCache } from "@hexo-cms/ui/with-cache";
import { DesktopDataProvider } from "./desktop-data-provider";

export const desktopDataProvider = withCache(new DesktopDataProvider());
