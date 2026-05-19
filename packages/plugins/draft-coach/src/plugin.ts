import { definePlugin } from "@hexo-cms/core";
import { createDraftCoachEventHandler } from "./event-handler";
import { DraftCoachWidget } from "./widget";
import { draftCoachManifest } from "./manifest";

export const draftCoachPlugin = definePlugin({
  manifest: draftCoachManifest,
  renderers: {
    "draft.overview": DraftCoachWidget,
  },
  events: {
    "post.afterSave": ({ getConfig, storage }) => createDraftCoachEventHandler(getConfig, storage),
  },
});
