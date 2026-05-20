import { definePlugin } from "@hexo-cms/core";
import { createDraftCoachEventHandler } from "./event-handler";
import { draftCoachManifest } from "./manifest";
import { DraftCoachWidget } from "./widget";

export const draftCoachPlugin = definePlugin({
  manifest: draftCoachManifest,
  renderers: {
    "draft.overview": DraftCoachWidget,
  },
  events: {
    "post.afterSave": ({ getConfig, storage, t }) =>
      createDraftCoachEventHandler(getConfig, storage, t),
  },
});
