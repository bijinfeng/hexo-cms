import Image from "@tiptap/extension-image";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface ImageUploadOptions {
  uploadFn?: (file: File) => Promise<string>;
  onUploadError?: (error: Error) => void;
}

export const ImageUpload = Image.extend<ImageUploadOptions>({
  name: "image",

  addOptions() {
    return {
      ...this.parent?.(),
      uploadFn: undefined,
      onUploadError: undefined,
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },

  addProseMirrorPlugins() {
    const uploadFn = this.options.uploadFn;
    const onUploadError = this.options.onUploadError;
    if (!uploadFn) return [];

    function handleUploadError(err: unknown) {
      console.error("Image upload failed:", err);
      onUploadError?.(err instanceof Error ? err : new Error("Upload failed"));
    }

    return [
      new Plugin({
        key: new PluginKey("image-upload-handler"),
        props: {
          handlePaste(view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;

            for (const item of items) {
              if (item.type.startsWith("image/")) {
                event.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                uploadFn(file)
                  .then((url) => {
                    const { state } = view;
                    const node = state.schema.nodes.image.create({ src: url });
                    const tr = state.tr.replaceSelectionWith(node);
                    view.dispatch(tr);
                  })
                  .catch(handleUploadError);

                return true;
              }
            }
            return false;
          },

          handleDrop(view, event) {
            const files = event.dataTransfer?.files;
            if (!files?.length) return false;

            for (const file of files) {
              if (file.type.startsWith("image/")) {
                event.preventDefault();
                const coords = { left: event.clientX, top: event.clientY };
                const pos = view.posAtCoords(coords);

                uploadFn(file)
                  .then((url) => {
                    const node = view.state.schema.nodes.image.create({ src: url });
                    const tr = view.state.tr.insert(
                      pos?.pos ?? view.state.selection.from,
                      node,
                    );
                    view.dispatch(tr);
                  })
                  .catch(handleUploadError);

                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
