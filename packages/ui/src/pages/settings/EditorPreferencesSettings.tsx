import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useEditorPreferences } from "../../hooks/use-editor-preferences";
import { useI18n } from "../../i18n/I18nProvider";
import { FormField } from "./FormField";

export function EditorPreferencesSettings() {
  const { t } = useI18n();
  const [prefs, updatePrefs] = useEditorPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.editor.title")}</CardTitle>
        <CardDescription>{t("settings.editor.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          label={t("settings.editor.fontSize")}
          description={t("settings.editor.fontSizeHint")}
        >
          <Select
            value={String(prefs.fontSize)}
            onValueChange={(v) => updatePrefs({ fontSize: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="12">12px</SelectItem>
                <SelectItem value="14">14px</SelectItem>
                <SelectItem value="16">16px</SelectItem>
                <SelectItem value="18">18px</SelectItem>
                <SelectItem value="20">20px</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label={t("settings.editor.editorTheme")}
          description={t("settings.editor.editorThemeHint")}
        >
          <Select
            value={prefs.editorTheme}
            onValueChange={(v) => updatePrefs({ editorTheme: v as "system" | "light" | "dark" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="system">{t("settings.editor.themeSystem")}</SelectItem>
                <SelectItem value="light">{t("settings.editor.themeLight")}</SelectItem>
                <SelectItem value="dark">{t("settings.editor.themeDark")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label={t("settings.editor.autoSaveInterval")}
          description={t("settings.editor.autoSaveHint")}
        >
          <Select
            value={String(prefs.autoSaveInterval)}
            onValueChange={(v) => updatePrefs({ autoSaveInterval: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="0">{t("settings.editor.intervalOff")}</SelectItem>
                <SelectItem value="15000">{t("settings.editor.interval15s")}</SelectItem>
                <SelectItem value="30000">{t("settings.editor.interval30s")}</SelectItem>
                <SelectItem value="60000">{t("settings.editor.interval60s")}</SelectItem>
                <SelectItem value="120000">{t("settings.editor.interval120s")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  );
}
