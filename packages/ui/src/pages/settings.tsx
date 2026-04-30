import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Globe,
  Github,
  User,
  Bell,
  Shield,
  Save,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

const settingsSections = [
  { id: "site", label: "站点信息", icon: Globe },
  { id: "github", label: "GitHub 集成", icon: Github },
  { id: "profile", label: "个人资料", icon: User },
  { id: "notifications", label: "通知设置", icon: Bell },
  { id: "security", label: "安全设置", icon: Shield },
];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState("site");
  const [saved, setSaved] = useState(false);

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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Nav */}
        <div className="lg:w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {settingsSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer text-left ${
                    activeSection === section.id
                      ? "bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)]"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {section.label}
                  {activeSection === section.id && (
                    <ChevronRight size={14} className="ml-auto" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-4">
          {activeSection === "site" && <SiteSettings />}
          {activeSection === "github" && <GitHubSettings />}
          {activeSection === "profile" && <ProfileSettings />}
          {activeSection === "notifications" && <NotificationSettings />}
          {activeSection === "security" && <SecuritySettings />}
        </div>
      </div>
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
          <input
            type="text"
            defaultValue="Kebai's Blog"
            className="form-input"
          />
        </FormField>
        <FormField label="站点描述" description="简短描述你的博客">
          <textarea
            defaultValue="分享技术、生活和思考"
            rows={3}
            className="form-input resize-none"
          />
        </FormField>
        <FormField label="站点 URL" description="博客的访问地址">
          <input
            type="url"
            defaultValue="https://kebai.github.io"
            className="form-input"
          />
        </FormField>
        <FormField label="作者名称">
          <input
            type="text"
            defaultValue="Kebai"
            className="form-input"
          />
        </FormField>
        <FormField label="语言">
          <select className="form-input">
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
            <option value="zh-TW">繁體中文</option>
          </select>
        </FormField>
        <FormField label="时区">
          <select className="form-input">
            <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
            <option value="UTC">UTC</option>
          </select>
        </FormField>
      </CardContent>
    </Card>
  );
}

function GitHubSettings() {
  const [config, setConfig] = useState<any>(null);
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
        const res = await fetch("/api/github/config");
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setOwner(data.config.owner || "");
          setRepo(data.config.repo || "");
          setBranch(data.config.branch || "main");
          setPostsDir(data.config.posts_dir || "source/_posts");
          setMediaDir(data.config.media_dir || "source/images");
          setWorkflowFile(data.config.workflow_file || ".github/workflows/deploy.yml");
          setAutoDeploy(data.config.auto_deploy === 1);
          setDeployNotifications(data.config.deploy_notifications === 1);
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
      const res = await fetch("/api/github/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo,
          branch,
          posts_dir: postsDir,
          media_dir: mediaDir,
          workflow_file: workflowFile,
          auto_deploy: autoDeploy,
          deploy_notifications: deployNotifications,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTimeout(() => setSaving(false), 1000);
        }
      }
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
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="owner"
                className="form-input flex-1"
              />
              <span className="text-[var(--text-tertiary)] self-center">/</span>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="repo"
                className="form-input flex-1"
              />
            </div>
          </FormField>
          <FormField label="默认分支">
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="form-input"
            />
          </FormField>
          <FormField label="文章目录" description="Hexo 文章存放路径">
            <input
              type="text"
              value={postsDir}
              onChange={(e) => setPostsDir(e.target.value)}
              className="form-input font-mono text-sm"
            />
          </FormField>
          <FormField label="媒体目录" description="图片等媒体文件路径">
            <input
              type="text"
              value={mediaDir}
              onChange={(e) => setMediaDir(e.target.value)}
              className="form-input font-mono text-sm"
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
            <input
              type="text"
              value={workflowFile}
              onChange={(e) => setWorkflowFile(e.target.value)}
              className="form-input font-mono text-sm"
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
          <input type="text" defaultValue="Kebai" className="form-input" />
        </FormField>
        <FormField label="邮箱">
          <input type="email" defaultValue="kebai@example.com" className="form-input" />
        </FormField>
        <FormField label="个人简介">
          <textarea
            defaultValue="全栈开发者，热爱开源"
            rows={3}
            className="form-input resize-none"
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

  function handleToggle() {
    if (onChange) {
      onChange(!checked);
    } else {
      setInternalChecked((v) => !v);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-[var(--text-primary)]">{label}</div>
        <div className="text-xs text-[var(--text-tertiary)]">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={handleToggle}
        className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
          checked ? "bg-[var(--brand-primary)]" : "bg-[var(--border-strong)]"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
