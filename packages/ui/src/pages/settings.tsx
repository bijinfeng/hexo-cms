import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useDataProvider } from "../context/data-provider-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import {
  Globe,
  User,
  Bell,
  Shield,
  Puzzle,
  Save,
  ExternalLink,
  CheckCircle2,
  LogOut,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { GithubIcon } from "../components/ui/github-icon";
import type { GitHubConfig } from "@hexo-cms/core";
import type { AuthClient, AuthSession } from "../types/auth";
import { PluginSettingsPanel } from "../plugin";
import { useEditorPreferences } from "../hooks/use-editor-preferences";

export interface SettingsSectionDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  render: () => ReactNode;
}

const baseSections = [
  { id: "site", label: "站点信息", icon: Globe },
  { id: "github", label: "GitHub 集成", icon: GithubIcon },
  { id: "profile", label: "个人资料", icon: User },
  { id: "notifications", label: "通知设置", icon: Bell },
  { id: "plugins", label: "插件管理", icon: Puzzle },
  { id: "security", label: "安全设置", icon: Shield },
];

function getInitialSettingsSection(allowedIds: Set<string>): string {
  if (typeof window === "undefined") return "site";
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("section") ?? window.location.hash.replace(/^#/, "");
  return requested && allowedIds.has(requested) ? requested : "site";
}

export interface SettingsPageProps {
  authClient?: AuthClient;
  initialSection?: string;
  onSignedOut?: () => void;
  extraSections?: SettingsSectionDef[];
}

export function SettingsPage({ authClient, initialSection, onSignedOut, extraSections }: SettingsPageProps) {
  const allSections = extraSections && extraSections.length > 0
    ? [...baseSections, ...extraSections]
    : baseSections;
  const sectionIds = new Set(allSections.map((s) => s.id));

  const [activeSection, setActiveSection] = useState(() => {
    if (initialSection) return sectionIds.has(initialSection) ? initialSection : "site";
    return getInitialSettingsSection(sectionIds);
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setActiveSection(initialSection ? (sectionIds.has(initialSection) ? initialSection : "site") : getInitialSettingsSection(sectionIds));
  }, [initialSection, extraSections]);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">站点设置</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            管理站点配置和集成
          </p>
        </div>
        <Button onClick={handleSave} variant={saved ? "success" : "default"}>
          {saved ? (
            <>
              <CheckCircle2 size={16} />
              已保存
            </>
          ) : (
            <>
              <Save size={16} />
              保存更改
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection} orientation="vertical" className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <TabsList className="flex-col lg:w-52 h-auto bg-transparent p-0 space-y-0.5">
          {allSections.map((section) => {
            const Icon = section.icon;
            return (
              <TabsTrigger
                key={section.id}
                value={section.id}
                className="w-full justify-start gap-3 px-3 py-2.5 data-[state=active]:bg-[var(--brand-primary-subtle)] data-[state=active]:text-[var(--brand-primary)] data-[state=active]:shadow-none data-[state=inactive]:text-[var(--text-secondary)]"
              >
                <Icon size={16} className="flex-shrink-0" />
                {section.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {activeSection === "site" && <SiteSettings />}
          {activeSection === "github" && <GitHubSettings authClient={authClient} onSignedOut={onSignedOut} />}
          {activeSection === "profile" && <ProfileSettings />}
          {activeSection === "editor" && <EditorPreferencesSettings />}
          {activeSection === "notifications" && <NotificationSettings />}
          {activeSection === "plugins" && <PluginSettingsPanel />}
          {activeSection === "security" && <SecuritySettings />}
          {extraSections?.map((section) =>
            activeSection === section.id ? <section key={section.id}>{section.render()}</section> : null,
          )}
        </div>
      </Tabs>
    </div>
  );
}

function SiteSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>站点信息</CardTitle>
        <CardDescription>配置博客的基本信息</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="站点名称" description="显示在浏览器标签和 SEO 中">
          <Input
            type="text"
            defaultValue="Kebai's Blog"
          />
        </FormField>
        <FormField label="站点描述" description="简短描述你的博客">
          <Textarea
            defaultValue="分享技术、生活和思考"
            rows={3}
            className="resize-none"
          />
        </FormField>
        <FormField label="站点 URL" description="博客的访问地址">
          <Input
            type="url"
            defaultValue="https://kebai.github.io"
          />
        </FormField>
        <FormField label="作者名称">
          <Input
            type="text"
            defaultValue="Kebai"
          />
        </FormField>
        <FormField label="语言">
          <Select defaultValue="zh-CN">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh-TW">繁體中文</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="时区">
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

function GitHubSettings({
  authClient,
  onSignedOut,
}: {
  authClient?: AuthClient;
  onSignedOut?: () => void;
}) {
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
      } catch (error) {
        console.error("Failed to load config:", error);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await dataProvider.saveConfig({
        owner,
        repo,
        branch,
        posts_dir: postsDir,
        media_dir: mediaDir,
        workflow_file: workflowFile,
        auto_deploy: autoDeploy,
        deploy_notifications: deployNotifications,
      });
      setTimeout(() => setSaving(false), 1000);
    } catch (error) {
      console.error("Failed to save config:", error);
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-[var(--text-secondary)]">加载中...</div>;
  }

  const repoUrl = owner && repo ? `https://github.com/${owner}/${repo}` : null;

  return (
    <div className="space-y-4">
      {authClient && <GitHubAuthSettings authClient={authClient} onSignedOut={onSignedOut} />}

      <Card>
        <CardHeader>
          <CardTitle>GitHub 仓库</CardTitle>
          <CardDescription>连接你的 Hexo 博客仓库</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config && owner && repo && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--status-success-bg)] border border-[var(--status-success)]">
              <CheckCircle2 size={16} className="text-[var(--status-success)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">已连接</div>
                <div className="text-xs text-[var(--text-secondary)]">{owner}/{repo}</div>
              </div>
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline cursor-pointer"
                >
                  查看仓库
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}

          <FormField label="仓库地址" description="格式: owner/repo">
            <div className="flex gap-2">
              <Input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="owner"
                className="flex-1"
              />
              <span className="text-[var(--text-tertiary)] self-center">/</span>
              <Input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="repo"
                className="flex-1"
              />
            </div>
          </FormField>
          <FormField label="默认分支">
            <Input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </FormField>
          <FormField label="文章目录" description="Hexo 文章存放路径">
            <Input
              type="text"
              value={postsDir}
              onChange={(e) => setPostsDir(e.target.value)}
              className="font-mono text-sm"
            />
          </FormField>
          <FormField label="媒体目录" description="图片等媒体文件路径">
            <Input
              type="text"
              value={mediaDir}
              onChange={(e) => setMediaDir(e.target.value)}
              className="font-mono text-sm"
            />
          </FormField>
          <Button onClick={handleSave} disabled={saving || !owner || !repo}>
            {saving ? "保存中..." : "保存配置"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GitHub Actions</CardTitle>
          <CardDescription>自动化部署配置</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField label="工作流文件" description="触发部署的 workflow 文件">
            <Input
              type="text"
              value={workflowFile}
              onChange={(e) => setWorkflowFile(e.target.value)}
              className="font-mono text-sm"
            />
          </FormField>
          <ToggleField
            label="推送后自动部署"
            description="每次提交后自动触发 GitHub Actions"
            checked={autoDeploy}
            onChange={setAutoDeploy}
          />
          <ToggleField
            label="部署通知"
            description="部署完成后发送通知"
            checked={deployNotifications}
            onChange={setDeployNotifications}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function GitHubAuthSettings({
  authClient,
  onSignedOut,
}: {
  authClient: AuthClient;
  onSignedOut?: () => void;
}) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<"reauthorize" | "signOut" | null>(null);
  const deviceFlow = session?.deviceFlow;

  useEffect(() => {
    let active = true;

    authClient
      .getSession()
      .then((nextSession) => {
        if (active) setSession(nextSession);
      })
      .catch(() => {
        if (active) setSession({ state: "error", error: "AUTH_NETWORK_ERROR" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authClient]);

  useEffect(() => {
    if (!deviceFlow) return;

    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const nextSession = await authClient.getSession();
        if (!active) return;
        setSession(nextSession);
        if (nextSession.state === "authenticated" || nextSession.state === "error") {
          window.clearInterval(timer);
        }
      } catch {
        if (active) setSession({ state: "error", error: "AUTH_NETWORK_ERROR" });
      }
    }, Math.max(deviceFlow.interval, 1) * 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [authClient, deviceFlow]);

  async function handleReauthorize() {
    setPendingAction("reauthorize");
    try {
      const nextSession = await authClient.reauthorize();
      setSession(nextSession);
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSignOut() {
    setPendingAction("signOut");
    try {
      await authClient.signOut();
      setSession({ state: "anonymous" });
      onSignedOut?.();
    } finally {
      setPendingAction(null);
    }
  }

  const user = session?.user;
  const displayName = user?.name || user?.login || user?.email || "GitHub 用户";
  const statusText = loading
    ? "检查授权状态中"
    : session?.state === "authenticated"
      ? "已通过 GitHub OAuth 授权"
      : "需要重新登录或授权";

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub 授权</CardTitle>
        <CardDescription>管理当前 GitHub OAuth 登录状态</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]">
              <GithubIcon size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-[var(--text-primary)]">
              {loading ? "读取中..." : displayName}
            </div>
            <div className="truncate text-xs text-[var(--text-secondary)]">
              {statusText}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleReauthorize}
            disabled={pendingAction !== null}
          >
            <RefreshCw size={16} />
            {pendingAction === "reauthorize" ? "授权中..." : "重新授权"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleSignOut}
            disabled={pendingAction !== null}
          >
            <LogOut size={16} />
            {pendingAction === "signOut" ? "退出中..." : "退出登录"}
          </Button>
        </div>

        {deviceFlow && (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3 text-center">
            <p className="text-xs text-[var(--text-secondary)]">在 GitHub 页面输入授权码</p>
            <div className="mt-2 rounded-md bg-[var(--bg-card)] px-3 py-2 font-mono text-xl font-bold tracking-widest text-[var(--text-primary)]">
              {deviceFlow.userCode}
            </div>
            <a
              href={deviceFlow.verificationUri}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-2 text-xs font-medium text-[var(--brand-primary)] hover:underline"
            >
              打开 GitHub 授权页面
              <ArrowRight size={12} />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditorPreferencesSettings() {
  const [prefs, updatePrefs] = useEditorPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>编辑器偏好</CardTitle>
        <CardDescription>自定义编辑器体验</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField label="字体大小" description="编辑器的字体大小">
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

        <FormField label="编辑器主题" description="选择编辑器的外观主题">
          <Select
            value={prefs.editorTheme}
            onValueChange={(v) => updatePrefs({ editorTheme: v as "system" | "light" | "dark" })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="system">跟随系统</SelectItem>
                <SelectItem value="light">亮色</SelectItem>
                <SelectItem value="dark">暗色</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="自动保存间隔" description="编辑器自动保存草稿的时间间隔">
          <Select
            value={String(prefs.autoSaveInterval)}
            onValueChange={(v) => updatePrefs({ autoSaveInterval: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="0">关</SelectItem>
                <SelectItem value="15000">15秒</SelectItem>
                <SelectItem value="30000">30秒</SelectItem>
                <SelectItem value="60000">60秒</SelectItem>
                <SelectItem value="120000">120秒</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  );
}


function ProfileSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>个人资料</CardTitle>
        <CardDescription>管理你的账户信息</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b border-[var(--border-default)]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white text-2xl font-bold">
            K
          </div>
          <div>
            <Button variant="outline" size="sm">更换头像</Button>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">支持 JPG、PNG，最大 2MB</p>
          </div>
        </div>
        <FormField label="显示名称">
          <Input type="text" defaultValue="Kebai" />
        </FormField>
        <FormField label="邮箱">
          <Input type="email" defaultValue="kebai@example.com" />
        </FormField>
        <FormField label="个人简介">
          <Textarea
            defaultValue="全栈开发者，热爱开源"
            rows={3}
            className="resize-none"
          />
        </FormField>
      </CardContent>
    </Card>
  );
}

function NotificationSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>通知设置</CardTitle>
        <CardDescription>配置何时接收通知</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ToggleField
          label="新评论通知"
          description="有新评论时发送通知"
          defaultChecked={true}
        />
        <ToggleField
          label="部署成功通知"
          description="部署成功后发送通知"
          defaultChecked={true}
        />
        <ToggleField
          label="部署失败通知"
          description="部署失败时立即通知"
          defaultChecked={true}
        />
        <ToggleField
          label="垃圾评论通知"
          description="检测到垃圾评论时通知"
          defaultChecked={false}
        />
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>访问控制</CardTitle>
          <CardDescription>管理 CMS 的访问权限</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleField
            label="需要登录"
            description="访问 CMS 需要 GitHub 账号登录"
            defaultChecked={true}
          />
          <ToggleField
            label="双因素认证"
            description="使用 GitHub OAuth 进行身份验证"
            defaultChecked={true}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>危险操作</CardTitle>
          <CardDescription>这些操作不可逆，请谨慎操作</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-[var(--status-error)] bg-[var(--status-error-bg)]">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">清除所有缓存</div>
              <div className="text-xs text-[var(--text-secondary)]">清除本地缓存的文章和媒体数据</div>
            </div>
            <Button variant="destructive" size="sm">清除缓存</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FormField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--text-primary)]">{label}</label>
      {description && (
        <p className="text-xs text-[var(--text-tertiary)]">{description}</p>
      )}
      {children}
    </div>
  );
}

function ToggleField({
  label,
  description,
  defaultChecked,
  checked: controlledChecked,
  onChange,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const checked = controlledChecked !== undefined ? controlledChecked : internalChecked;

  function handleCheckedChange(nextChecked: boolean) {
    if (onChange) {
      onChange(nextChecked);
    } else {
      setInternalChecked(nextChecked);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
        <div className="text-xs text-[var(--text-tertiary)]">{description}</div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={handleCheckedChange}
        aria-label={label}
      />
    </div>
  );
}
