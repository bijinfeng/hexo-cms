import { useState, useEffect } from "react";
import { useDataProvider } from "../../context/data-provider-context";
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

  if (loading) return <div className="text-sm text-[var(--text-secondary)]">加载中...</div>;

  const repoUrl = owner && repo ? `https://github.com/${owner}/${repo}` : null;

  return (
    <div className="space-y-4">
      {authClient && <GitHubAuthSettings authClient={authClient} onSignedOut={onSignedOut} />}
      <Card>
        <CardHeader><CardTitle>GitHub 仓库</CardTitle><CardDescription>连接你的 Hexo 博客仓库</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {config && owner && repo && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--status-success-bg)] border border-[var(--status-success)]">
              <CheckCircle2 size={16} className="text-[var(--status-success)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">已连接</div>
                <div className="text-xs text-[var(--text-secondary)]">{owner}/{repo}</div>
              </div>
              {repoUrl && <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline cursor-pointer">查看仓库<ExternalLink size={10} /></a>}
            </div>
          )}
          <FormField label="仓库地址" description="格式: owner/repo">
            <div className="flex gap-2">
              <Input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="owner" className="flex-1" />
              <span className="text-[var(--text-tertiary)] self-center">/</span>
              <Input type="text" value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="repo" className="flex-1" />
            </div>
          </FormField>
          <FormField label="默认分支"><Input type="text" value={branch} onChange={(e) => setBranch(e.target.value)} /></FormField>
          <FormField label="文章目录" description="Hexo 文章存放路径"><Input type="text" value={postsDir} onChange={(e) => setPostsDir(e.target.value)} className="font-mono text-sm" /></FormField>
          <FormField label="媒体目录" description="图片等媒体文件路径"><Input type="text" value={mediaDir} onChange={(e) => setMediaDir(e.target.value)} className="font-mono text-sm" /></FormField>
          <Button onClick={handleSave} disabled={saving || !owner || !repo}>{saving ? "保存中..." : "保存配置"}</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>GitHub Actions</CardTitle><CardDescription>自动化部署配置</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <FormField label="工作流文件" description="触发部署的 workflow 文件"><Input type="text" value={workflowFile} onChange={(e) => setWorkflowFile(e.target.value)} className="font-mono text-sm" /></FormField>
          <ToggleField label="推送后自动部署" description="每次提交后自动触发 GitHub Actions" checked={autoDeploy} onChange={setAutoDeploy} />
          <ToggleField label="部署通知" description="部署完成后发送通知" checked={deployNotifications} onChange={setDeployNotifications} />
        </CardContent>
      </Card>
    </div>
  );
}
