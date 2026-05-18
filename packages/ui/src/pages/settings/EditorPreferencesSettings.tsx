import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { useEditorPreferences } from "../../hooks/use-editor-preferences";
import { FormField } from "./FormField";

export function EditorPreferencesSettings() {
  const [prefs, updatePrefs] = useEditorPreferences();

  return (
    <Card>
      <CardHeader><CardTitle>编辑器偏好</CardTitle><CardDescription>自定义编辑器体验</CardDescription></CardHeader>
      <CardContent className="space-y-6">
        <FormField label="字体大小" description="编辑器的字体大小">
          <Select value={String(prefs.fontSize)} onValueChange={(v) => updatePrefs({ fontSize: Number(v) })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="12">12px</SelectItem><SelectItem value="14">14px</SelectItem><SelectItem value="16">16px</SelectItem><SelectItem value="18">18px</SelectItem><SelectItem value="20">20px</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </FormField>
        <FormField label="编辑器主题" description="选择编辑器的外观主题">
          <Select value={prefs.editorTheme} onValueChange={(v) => updatePrefs({ editorTheme: v as "system" | "light" | "dark" })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="system">跟随系统</SelectItem><SelectItem value="light">亮色</SelectItem><SelectItem value="dark">暗色</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </FormField>
        <FormField label="自动保存间隔" description="编辑器自动保存草稿的时间间隔">
          <Select value={String(prefs.autoSaveInterval)} onValueChange={(v) => updatePrefs({ autoSaveInterval: Number(v) })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem value="0">关</SelectItem><SelectItem value="15000">15秒</SelectItem><SelectItem value="30000">30秒</SelectItem><SelectItem value="60000">60秒</SelectItem><SelectItem value="120000">120秒</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  );
}
