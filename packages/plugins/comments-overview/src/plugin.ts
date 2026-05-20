import { definePlugin } from "@hexo-cms/core";
import { commentsOverviewManifest } from "./manifest";
import { CommentsOverviewWidget } from "./widgets/comments-overview-widget";

export const commentsOverviewPlugin = definePlugin({
  manifest: commentsOverviewManifest,
  renderers: {
    "comments.overview": CommentsOverviewWidget,
  },
  commands: {
    "comments.openModeration":
      () =>
      ({ args }) => {
        const url = typeof args[0] === "string" && args[0] ? args[0] : "/comments";
        if (typeof window !== "undefined") window.location.assign(url);
        return url;
      },
  },
});
