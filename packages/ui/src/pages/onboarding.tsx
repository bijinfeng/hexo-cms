import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Search, Settings2 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { GithubIcon } from "../components/ui/github-icon";
import type {
  OnboardingClient,
  OnboardingUser,
  RepositoryConfigInput,
  RepositoryOption,
  RepositorySelection,
  RepositoryValidation,
  RepositoryValidationError,
} from "../types/onboarding";

type OnboardingPageProps = { onboardingClient: OnboardingClient };

const VALIDATION_ERROR_MESSAGES: Record<RepositoryValidationError, string> = {
  REPO_NOT_FOUND: "未找到这个仓库，请确认已授权访问",
  PERMISSION_REQUIRED: "当前授权缺少仓库读写权限，请重新授权",
  BRANCH_NOT_FOUND: "未找到目标分支",
  NOT_HEXO_REPO: "未检测到 Hexo 配置，请选择已有 Hexo 博客仓库",
  NETWORK_ERROR: "验证失败，请重试",
  REAUTH_REQUIRED: "当前授权缺少仓库读写权限，请重新授权",
};

const FALLBACK_CONFIG = {
  postsDir: "source/_posts",
  mediaDir: "source/images",
  workflowFile: ".github/workflows/deploy.yml",
  autoDeploy: true,
  deployNotifications: true,
};

function getValidationErrorMessage(validation: RepositoryValidation | null) {
  if (!validation || validation.ok) return "";
  if (validation.error) return VALIDATION_ERROR_MESSAGES[validation.error];
  return validation.checks.find((check) => check.status === "error")?.message ?? "验证失败，请重试";
}

function getUpdatedText(pushedAt?: string | null) {
  if (!pushedAt) return "最近更新未知";

  const date = new Date(pushedAt);
  if (Number.isNaN(date.getTime())) return "最近更新未知";

  return `更新于 ${date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })}`;
}

function createConfigFromSelection(
  selection: RepositorySelection,
  validation: RepositoryValidation,
): RepositoryConfigInput {
  return {
    owner: selection.owner,
    repo: selection.repo,
    branch: selection.branch || "main",
    ...FALLBACK_CONFIG,
    ...validation.defaultConfig,
  };
}

export function OnboardingPage({ onboardingClient }: OnboardingPageProps) {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<OnboardingUser | null>(null);
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [query, setQuery] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [repoError, setRepoError] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [selectedRepository, setSelectedRepository] = useState<RepositoryOption | null>(null);
  const [selectedSelection, setSelectedSelection] = useState<RepositorySelection | null>(null);
  const [validation, setValidation] = useState<RepositoryValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualOwner, setManualOwner] = useState("");
  const [manualRepo, setManualRepo] = useState("");
  const [manualBranch, setManualBranch] = useState("main");

  async function loadRepositories(nextQuery = query) {
    setLoadingRepos(true);
    setRepoError("");
    try {
      const [user, repoList] = await Promise.all([
        onboardingClient.getCurrentUser(),
        onboardingClient.listRepositories({ query: nextQuery }),
      ]);
      setCurrentUser(user);
      setRepositories(repoList);
    } catch {
      setRepoError("仓库加载失败，请重试");
      setRepositories([]);
    } finally {
      setLoadingRepos(false);
    }
  }

  useEffect(() => {
    void loadRepositories("");
  }, []);

  const filteredRepositories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return repositories;

    return repositories.filter((repository) =>
      repository.fullName.toLowerCase().includes(normalizedQuery),
    );
  }, [query, repositories]);

  const config = useMemo(() => {
    if (!validation?.ok || !selectedSelection) return null;
    return createConfigFromSelection(selectedSelection, validation);
  }, [selectedSelection, validation]);

  const validationError = getValidationErrorMessage(validation);

  async function validateSelection(selection: RepositorySelection, repository?: RepositoryOption) {
    setSelectedRepoId(repository?.id ?? "");
    setSelectedRepository(repository ?? null);
    setSelectedSelection(selection);
    setValidation(null);
    setValidating(true);
    try {
      const nextValidation = await onboardingClient.validateRepository(selection);
      setValidation(nextValidation);
    } catch {
      setValidation({
        ok: false,
        checks: [],
        error: "NETWORK_ERROR",
      });
    } finally {
      setValidating(false);
    }
  }

  async function handleRepositoryClick(repository: RepositoryOption) {
    await validateSelection(
      {
        owner: repository.owner,
        repo: repository.name,
        branch: repository.defaultBranch,
      },
      repository,
    );
  }

  async function handleManualValidate() {
    const owner = manualOwner.trim();
    const repo = manualRepo.trim();
    const branch = manualBranch.trim() || "main";
    if (!owner || !repo) return;

    await validateSelection({ owner, repo, branch });
  }

  async function handleReauthorize() {
    await onboardingClient.reauthorize();
    await loadRepositories("");
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await onboardingClient.saveRepositoryConfig(config);
      navigate({ to: "/" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] p-4 sm:p-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]">
              <GithubIcon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">导入 Hexo 仓库</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              HexoCMS 会在开始管理前验证所选 GitHub 仓库的访问权限、默认分支和 Hexo 结构。
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt=""
                className="h-10 w-10 rounded-full"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--text-tertiary)]">
                <GithubIcon className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                {currentUser?.name || currentUser?.login || "GitHub"}
              </p>
              <p className="truncate text-xs text-[var(--text-tertiary)]">
                {currentUser?.login ? `@${currentUser.login}` : "正在读取账号"}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleReauthorize}>
              <RefreshCw className="h-4 w-4" />
              重新授权
            </Button>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
            <div className="border-b border-[var(--border-default)] p-4">
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3">
                <Search className="h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索仓库"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                />
              </div>
            </div>

            <div className="min-h-72 divide-y divide-[var(--border-default)]">
              {loadingRepos ? (
                <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在读取仓库
                </div>
              ) : filteredRepositories.length > 0 ? (
                filteredRepositories.map((repository) => (
                  <button
                    key={repository.id}
                    type="button"
                    onClick={() => void handleRepositoryClick(repository)}
                    className={`flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-[var(--bg-muted)] ${
                      selectedRepoId === repository.id ? "bg-[var(--brand-primary-subtle)]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--text-primary)]">{repository.fullName}</p>
                        <Badge variant={repository.private ? "warning" : "green"}>
                          {repository.private ? "私有" : "公开"}
                        </Badge>
                        {repository.permissions.push && <Badge variant="success">可写</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        默认分支 {repository.defaultBranch} · {getUpdatedText(repository.pushedAt)}
                      </p>
                    </div>
                    {selectedRepoId === repository.id && validating ? (
                      <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-[var(--brand-primary)]" />
                    ) : (
                      <CheckCircle2
                        className={`h-5 w-5 flex-shrink-0 ${
                          selectedRepoId === repository.id
                            ? "text-[var(--status-success)]"
                            : "text-[var(--text-tertiary)]"
                        }`}
                      />
                    )}
                  </button>
                ))
              ) : (
                <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-[var(--text-tertiary)]" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    未找到可写仓库，请检查 GitHub 授权权限
                  </p>
                  {repoError && <p className="text-xs text-[var(--status-error)]">{repoError}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadRepositories(query)}>
                    <RefreshCw className="h-4 w-4" />
                    重试
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border-default)] p-4">
              <Button
                type="button"
                variant="link"
                onClick={() => setShowManual((current) => !current)}
              >
                找不到仓库？手动输入
              </Button>
              {showManual && (
                <div className="mt-4 grid gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-4 sm:grid-cols-[1fr_1fr_120px_auto]">
                  <input
                    type="text"
                    value={manualOwner}
                    onChange={(event) => setManualOwner(event.target.value)}
                    placeholder="owner"
                    aria-label="仓库所有者"
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={manualRepo}
                    onChange={(event) => setManualRepo(event.target.value)}
                    placeholder="repo"
                    aria-label="仓库名称"
                    className="form-input"
                  />
                  <input
                    type="text"
                    value={manualBranch}
                    onChange={(event) => setManualBranch(event.target.value)}
                    placeholder="main"
                    aria-label="分支"
                    className="form-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleManualValidate()}
                    disabled={!manualOwner.trim() || !manualRepo.trim() || validating}
                  >
                    {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    验证
                  </Button>
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-[var(--brand-primary)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">仓库检查</h2>
            </div>

            {selectedSelection ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-lg bg-[var(--bg-muted)] p-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {selectedRepository?.fullName ?? `${selectedSelection.owner}/${selectedSelection.repo}`}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                    分支 {selectedSelection.branch || "main"}
                  </p>
                </div>

                {validating && (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在验证仓库
                  </div>
                )}

                {validation && (
                  <div className="space-y-3">
                    {validationError && (
                      <div className="rounded-lg border border-[var(--status-error-border)] bg-[var(--status-error-bg)] p-3 text-sm text-[var(--status-error)]">
                        {validationError}
                      </div>
                    )}

                    <div className="space-y-2">
                      {validation.checks.map((check) => (
                        <div key={check.id} className="flex items-center gap-2 text-sm">
                          {check.status === "success" ? (
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--status-success)]" />
                          ) : (
                            <AlertCircle className="h-4 w-4 flex-shrink-0 text-[var(--status-error)]" />
                          )}
                          <span className="text-[var(--text-secondary)]">{check.message}</span>
                        </div>
                      ))}
                    </div>

                    {config && (
                      <div className="space-y-4">
                        <details className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-3">
                          <summary className="cursor-pointer text-sm font-medium text-[var(--text-primary)]">
                            高级配置
                          </summary>
                          <dl className="mt-3 space-y-2 text-xs">
                            <div className="flex justify-between gap-3">
                              <dt className="text-[var(--text-tertiary)]">branch</dt>
                              <dd className="font-mono text-[var(--text-primary)]">{config.branch}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-[var(--text-tertiary)]">postsDir</dt>
                              <dd className="font-mono text-[var(--text-primary)]">{config.postsDir}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-[var(--text-tertiary)]">mediaDir</dt>
                              <dd className="font-mono text-[var(--text-primary)]">{config.mediaDir}</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt className="text-[var(--text-tertiary)]">workflowFile</dt>
                              <dd className="break-all font-mono text-[var(--text-primary)]">
                                {config.workflowFile}
                              </dd>
                            </div>
                          </dl>
                        </details>

                        <Button
                          type="button"
                          className="w-full"
                          onClick={() => void handleSave()}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          开始管理
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-[var(--text-secondary)]">
                选择一个有写权限的仓库后，HexoCMS 会自动检查它是否可以作为博客项目导入。
              </p>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}
