import { withCache } from "@hexo-cms/ui/with-cache";
import { WebDataProvider } from "./web-data-provider";

export const webDataProvider = withCache(new WebDataProvider());
