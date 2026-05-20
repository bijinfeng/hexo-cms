import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { useI18n } from "../../i18n/I18nProvider";
import { FormField } from "./FormField";

export function SiteSettings() {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.site.title")}</CardTitle>
        <CardDescription>{t("settings.site.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          label={t("settings.site.siteName")}
          description={t("settings.site.siteNameHint")}
        >
          <Input type="text" defaultValue="Kebai's Blog" />
        </FormField>
        <FormField
          label={t("settings.site.siteDesc")}
          description={t("settings.site.siteDescHint")}
        >
          <Textarea
            defaultValue={t("settings.site.siteDescDefault")}
            rows={3}
            className="resize-none"
          />
        </FormField>
        <FormField label={t("settings.site.siteUrl")} description={t("settings.site.siteUrlHint")}>
          <Input type="url" defaultValue="https://kebai.github.io" />
        </FormField>
        <FormField label={t("settings.site.authorName")}>
          <Input type="text" defaultValue="Kebai" />
        </FormField>
        <FormField label={t("settings.site.language")}>
          <Select defaultValue="zh-CN">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="zh-CN">{t("settings.site.languageZhCN")}</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh-TW">{t("settings.site.languageZhTW")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label={t("settings.site.timezone")}>
          <Select defaultValue="Asia/Shanghai">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="Asia/Shanghai">Asia/Shanghai (UTC+8)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  );
}
