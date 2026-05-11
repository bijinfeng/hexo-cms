import { withCache } from "@hexo-cms/ui";
import { WebDataProvider } from "./web-data-provider";

export const webDataProvider = withCache(new WebDataProvider());
