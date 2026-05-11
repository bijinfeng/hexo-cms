import { withCache } from "@hexo-cms/ui";
import { DesktopDataProvider } from "./desktop-data-provider";

export const desktopDataProvider = withCache(new DesktopDataProvider());
