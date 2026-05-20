import { AlertCircle, CheckCircle2, Download, Palette } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "../components/skeleton";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useSwitchTheme, useThemes } from "../hooks/use-themes-query";
import { useI18n } from "../i18n/I18nProvider";

export function ThemesPage() {
  const { t } = useI18n();
  const query = useThemes();
  const switchTheme = useSwitchTheme();
  const loading = query.isPending;
  const error = query.error?.message ?? "";
  const currentTheme = query.data?.currentTheme ?? null;
  const installedThemes = (query.data?.installedThemes ?? []).map((t) => t.name);
  const [notification, setNotification] = useState<string | null>(null);
  const switching = switchTheme.isPending;

  async function handleSwitchTheme(themeName: string) {
    if (switching) return;
    try {
      await switchTheme.mutateAsync(themeName);
      setNotification(t("themes.switched", { theme: themeName }));
    } catch (err) {
      setNotification(err instanceof Error ? err.message : t("themes.switchFailed"));
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <Skeleton width={128} height={28} />
        <Skeleton width={256} className="mt-2" />
        <div className="grid md:grid-cols-2 gap-4 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="card" height={120} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle size={48} className="text-[var(--status-error)]" />
        <p className="text-[var(--text-secondary)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{t("themes.title")}</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {currentTheme ? t("themes.subtitle", { theme: currentTheme }) : t("themes.description")}
          </p>
        </div>
        <Button variant="outline" disabled>
          <Download size={16} />
          {t("themes.installNew")}
        </Button>
      </div>

      {installedThemes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)]">
          <Palette size={40} className="mb-3 opacity-30" />
          <p className="text-sm">{t("themes.empty")}</p>
          <p className="text-xs mt-1">{t("themes.emptyHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {installedThemes.map((themeName) => {
            const isActive = currentTheme === themeName;
            return (
              <Card
                key={themeName}
                className={`transition-all ${
                  isActive
                    ? "border-[var(--brand-primary)] shadow-[var(--shadow-md)]"
                    : "hover:shadow-[var(--shadow-sm)]"
                }`}
              >
                <CardContent className="p-5">
                  <div className="w-full h-32 rounded-lg bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-subtle)] mb-4 flex items-center justify-center relative overflow-hidden">
                    <Palette size={32} className="text-[var(--text-tertiary)] opacity-30" />
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="success">{t("themes.currentUse")}</Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">
                        {themeName}
                      </h3>
                      <p className="text-xs text-[var(--text-tertiary)]">{t("themes.hexoTheme")}</p>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                    {t("themes.installedAt", { name: themeName })}
                  </p>

                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <Button variant="success" size="sm" className="flex-1" disabled>
                        <CheckCircle2 size={14} />
                        {t("common.enabled")}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSwitchTheme(themeName)}
                        disabled={switching}
                      >
                        {switching ? t("themes.switching") : t("themes.switchTo")}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!notification} onOpenChange={() => setNotification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.tip")}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{notification}</DialogDescription>
          <DialogFooter>
            <Button onClick={() => setNotification(null)}>{t("common.ok")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
