import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { useI18n } from "../../i18n/I18nProvider";
import { FormField } from "./FormField";

export function ProfileSettings() {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.profile.title")}</CardTitle>
        <CardDescription>{t("settings.profile.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-default)]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white text-2xl font-bold">
            K
          </div>
          <div>
            <Button variant="outline" size="sm">
              {t("settings.profile.changeAvatar")}
            </Button>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {t("settings.profile.avatarHint")}
            </p>
          </div>
        </div>
        <FormField label={t("settings.profile.displayName")}>
          <Input type="text" defaultValue="Kebai" />
        </FormField>
        <FormField label={t("settings.profile.email")}>
          <Input type="email" defaultValue="kebai@example.com" />
        </FormField>
        <FormField label={t("settings.profile.bio")}>
          <Textarea
            defaultValue={t("settings.profile.bioDefault")}
            rows={3}
            className="resize-none"
          />
        </FormField>
      </CardContent>
    </Card>
  );
}
