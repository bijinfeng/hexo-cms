import { definePlugin } from "@hexo-cms/core";
import { AttachmentsSummaryWidget } from "./widgets/attachments-summary-widget";
import { attachmentsHelperManifest } from "./manifest";

export const attachmentsHelperPlugin = definePlugin({
  defaultEnabled: true,
  manifest: attachmentsHelperManifest,
  renderers: {
    "attachments.summary": AttachmentsSummaryWidget,
  },
  commands: {
    "attachments.copyLink": () => async ({ args }) => {
      const value = typeof args[0] === "string" ? args[0] : "";
      if (!value) throw new Error("Attachment link is required.");
      await navigator.clipboard.writeText(value);
      return value;
    },
  },
});
