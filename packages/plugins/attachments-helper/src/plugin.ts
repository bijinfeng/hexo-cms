import { definePlugin } from "@hexo-cms/core";
import { attachmentsHelperManifest } from "./manifest";
import { AttachmentsSummaryWidget } from "./widgets/attachments-summary-widget";

export const attachmentsHelperPlugin = definePlugin({
  defaultEnabled: true,
  manifest: attachmentsHelperManifest,
  renderers: {
    "attachments.summary": AttachmentsSummaryWidget,
  },
  commands: {
    "attachments.copyLink":
      () =>
      async ({ args }) => {
        const value = typeof args[0] === "string" ? args[0] : "";
        if (!value) throw new Error("Attachment link is required.");
        await navigator.clipboard.writeText(value);
        return value;
      },
  },
});
