import { definePlugin } from "@hexo-cms/core";
import { createSeoPostDiagnosticsHandler, createSeoSiteDiagnosticsHandler } from "./diagnostics/seo-inspector";
import { seoInspectorManifest } from "./manifest";

export const seoInspectorPlugin = definePlugin({
  manifest: seoInspectorManifest,
  diagnostics: {
    "seo.post-checks": ({ getConfig }) => createSeoPostDiagnosticsHandler(getConfig),
    "seo.site-checks": ({ getConfig }) => createSeoSiteDiagnosticsHandler(getConfig),
  },
});
