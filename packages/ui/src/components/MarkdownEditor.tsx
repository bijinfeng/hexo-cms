import { Editor } from "@hexo-cms/editor";
import { useDataProvider } from "../context/data-provider-context";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const dataProvider = useDataProvider();

  const handleUploadMedia = async (file: File): Promise<string> => {
    const path = `source/images/${file.name}`;
    const result = await dataProvider.uploadMedia(file, path);
    return result.url;
  };

  return (
    <Editor
      value={value}
      onChange={onChange}
      onUploadMedia={handleUploadMedia}
    />
  );
}
