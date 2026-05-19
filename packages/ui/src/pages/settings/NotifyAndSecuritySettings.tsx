import { useI18n } from "../../i18n/I18nProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ToggleField } from "./FormField";

export function NotificationSettings() {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader><CardTitle>{t("settings.notify.title")}</CardTitle><CardDescription>{t("settings.notify.description")}</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <ToggleField label={t("settings.notify.newComment")} description={t("settings.notify.newCommentHint")} defaultChecked={true} />
        <ToggleField label={t("settings.notify.deploySuccess")} description={t("settings.notify.deploySuccessHint")} defaultChecked={true} />
        <ToggleField label={t("settings.notify.deployFail")} description={t("settings.notify.deployFailHint")} defaultChecked={true} />
        <ToggleField label={t("settings.notify.spamComment")} description={t("settings.notify.spamCommentHint")} defaultChecked={false} />
      </CardContent>
    </Card>
  );
}

export function SecuritySettings() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{t("settings.security.accessControl")}</CardTitle><CardDescription>{t("settings.security.accessControlDesc")}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <ToggleField label={t("settings.security.requireLogin")} description={t("settings.security.requireLoginHint")} defaultChecked={true} />
          <ToggleField label={t("settings.security.twoFactor")} description={t("settings.security.twoFactorHint")} defaultChecked={true} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("settings.security.dangerZone")}</CardTitle><CardDescription>{t("settings.security.dangerZoneDesc")}</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--status-error)] bg-[var(--status-error-bg)]">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">{t("settings.security.clearCache")}</div>
              <div className="text-xs text-[var(--text-secondary)]">{t("settings.security.clearCacheHint")}</div>
            </div>
            <Button variant="destructive" size="sm">{t("settings.security.clearCacheBtn")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
