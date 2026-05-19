import { useState, useEffect } from "react";
import { useDataProvider } from "../../context/data-provider-context";
import { useI18n } from "../../i18n/I18nProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { CheckCircle2, ExternalLink } from "lucide-react";
import type { GitHubConfig } from "@hexo-cms/core";
import type { AuthClient } from "../../types/auth";
import { GitHubAuthSettings } from "./GitHubAuthSettings";
import { FormField, ToggleField } from "./FormField";

interface GitHubSettingsProps {
  authClient?: AuthClient;
  onSignedOut?: () => void;
}

export function GitHubSettings({ authClient, onSignedOut }: GitHubSettingsProps) {
  const { t } = useI18n();
  const dataProvider = useDataProvider();
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [branch, setBranch] = useState("main");
  const [postsDir, setPostsDir] = useState("source/_posts");
  const [mediaDir, setMediaDir] = useState("source/images");
  const [workflowFile, setWorkflowFile] = useState(".github/workflows/deploy.yml");
  const [autoDeploy, setAutoDeploy] = useState(true);
  const [deployNotifications, setDeployNotifications] = useState(true);

  useEffect(() => {
    async function loadConfig() {
      try {
        const configData = await dataProvider.getConfig();
        if (configData) {
          setConfig(configData);
          setOwner(configData.owner || "");
          setRepo(configData.repo || "");
          setBranch(configData.branch || "main");
          setPostsDir(configData.posts_dir || configData.postsDir || "source/_posts");
          setMediaDir(configData.media_dir || configData.mediaDir || "source/images");
          setWorkflowFile(configData.workflow_file || configData.workflowFile || ".github/workflows/deploy.yml");
          setAutoDeploy(configData.auto_deploy === 1 || configData.autoDeploy === true);
          setDeployNotifications(configData.deploy_notifications === 1 || configData.deployNotifications === true);
        }
      } catch (error) { console.error("Failed to load config:", error); }
      finally { setLoading(false); }
    }
    loadConfig();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await dataProvider.saveConfig({
        owner, repo, branch,
        posts_dir: postsDir, media_dir: mediaDir,
        workflow_file: workflowFile,
        auto_deploy: autoDeploy,
        deploy_notifications: deployNotifications,
      });
      setTimeout(() => setSaving(false), 1000);
    } catch (error) { console.error("Failed to save config:", error); setSaving(false); }
  }

  if (loading) return <div className="text-sm text-[var(--text-secondary)]">{t("common.loading")}</div>;

  const repoUrl = owner && repo ? `https://github.com/${owner}/${repo}` : null;

  return (
    <div className="space-y-4">
      {authClient && <GitHubAuthSettings authClient={authClient} onSignedOut={onSignedOut} />}
      <Card>
        <CardHeader><CardTitle>{t("settings.github.title")}</CardTitle><CardDescription>{t("settings.github.description")}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {config && owner && repo && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--status-success-bg)] border border-[var(--status-success)]">
              <CheckCircle2 size={16} className="text-[var(--status-success)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">{t("settings.github.connected")}</div>
                <div className="text-xs text-[var(--text-secondary)]">{owner}/{repo}</div>
              </div>
              {repoUrl && <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline cursor-pointer">{t("settings.github.viewRepo")}<ExternalLink size={10} /></a>}
            </div>
          )}
          <FormField label={t("settings.github.repoAddress")} description={t("settings.github.repoFormat")}>
            <div className="flex gap-2">
              <Input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="owner" className="flex-1" />
              <span className="text-[var(--text-tertiary)] self-center">/</span>
              <Input type="text" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="repo" className="flex-1" />
            </div>
          </FormField>
          <FormField label={t("settings.github.branch")}><Input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} /></FormField>
          <FormField label={t("settings.github.postsDir")} description={t("settings.github.postsDirHint")}><Input type="text" value={postsDir} onChange={(e) => setPostsDir(e.target.value)} className="font-mono text-sm" /></FormField>
          <FormField label={t("settings.github.mediaDir")} description={t("settings.github.mediaDirHint")}><Input type="text" value={mediaDir} onChange={(e) => setMediaDir(e.target.value)} className="font-mono text-sm" /></FormField>
          <Button onClick={handleSave} disabled={saving || !owner || !repo}>{saving ? t("common.saving") : t("settings.github.saveConfig")}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("settings.github.githubActions")}</CardTitle><CardDescription>{t("settings.github.actionsDesc")}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <FormField label={t("settings.github.workflowFile")} description={t("settings.github.workflowHint")}><Input type="text" value={workflowFile} onChange={(e) => setWorkflowFile(e.target.value)} className="font-mono text-sm" /></FormField>
          <ToggleField label={t("settings.github.autoDeploy")} description={t("settings.github.autoDeployHint")} checked={autoDeploy} onChange={setAutoDeploy} />
          <ToggleField label={t("settings.github.deployNotify")} description={t("settings.github.deployNotifyHint")} checked={deployNotifications} onChange={setDeployNotifications} />
        </CardContent>
      </Card>
    </div>
  );
}
