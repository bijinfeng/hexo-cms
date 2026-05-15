import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, RefreshCw, Search, Settings2 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { GithubIcon } from "../components/ui/github-icon";
import { Input } from "../components/ui/input";
import type { AuthSession } from "../types/auth";
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
const SEARCH_DEBOUNCE_MS = 250;

function getValidationErrorMessage(validation: RepositoryValidation | null) {
  if (!validation || validation.ok) return "";
  if (validation.error) return VALIDATION_ERROR_MESSAGES[validation.error];
  return validation.checks.find((check) => check.status === "error")?.message ?? "验证失败，请重试";
}

function getAuthErrorMessage(error?: string) {
  switch (error) {
    case "AUTH_TIMEOUT":
      return "授权已过期，请重新授权";
    case "AUTH_REJECTED":
      return "GitHub 授权已取消，请重试";
    case "AUTH_DEVICE_FLOW_DISABLED":
      return "GitHub 设备授权未启用，请检查 OAuth App 配置";
    case "AUTH_NOT_CONFIGURED":
      return "GitHub 授权暂不可用，请检查配置";
    case "AUTH_SCOPE_INSUFFICIENT":
      return "当前授权缺少仓库权限，请重新授权";
    default:
      return "重新授权失败，请重试";
  }
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
  const hasLoadedRepositoriesRef = useRef(false);
  const loadedRepositoryQueryRef = useRef("");
  const repositoryRequestIdRef = useRef(0);
  const validationRequestIdRef = useRef(0);
  const [currentUser, setCurrentUser] = useState<OnboardingUser | null>(null);
  const [repositories, setRepositories] = useState<RepositoryOption[]>([]);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [searchingRepos, setSearchingRepos] = useState(false);
  const [repoError, setRepoError] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState("");
  const [selectedRepository, setSelectedRepository] = useState<RepositoryOption | null>(null);
  const [selectedSelection, setSelectedSelection] = useState<RepositorySelection | null>(null);
  const [validation, setValidation] = useState<RepositoryValidation | null>(null);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [reauthorizing, setReauthorizing] = useState(false);
  const [reauthorizationSession, setReauthorizationSession] = useState<AuthSession | null>(null);
  const [reauthorizeError, setReauthorizeError] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manualOwner, setManualOwner] = useState("");
  const [manualRepo, setManualRepo] = useState("");
  const [manualBranch, setManualBranch] = useState("main");
  const reauthorizationDeviceFlow = reauthorizationSession?.deviceFlow;

  const clearSelectedRepository = useCallback(() => {
    validationRequestIdRef.current += 1;
    setSelectedRepoId("");
    setSelectedRepository(null);
    setSelectedSelection(null);
    setValidation(null);
    setValidating(false);
    setSaveError("");
  }, []);

  const loadRepositories = useCallback(async (nextQuery: string) => {
    const requestId = repositoryRequestIdRef.current + 1;
    repositoryRequestIdRef.current = requestId;
    const isInitialLoad = !hasLoadedRepositoriesRef.current;
    const queryChanged = !isInitialLoad && nextQuery !== loadedRepositoryQueryRef.current;
    if (queryChanged) {
      clearSelectedRepository();
    }
    if (isInitialLoad) {
      setLoadingRepos(true);
    } else {
      setSearchingRepos(true);
    }
    setRepoError("");
    try {
      const [user, repoList] = await Promise.all([
        onboardingClient.getCurrentUser(),
        onboardingClient.listRepositories({ query: nextQuery }),
      ]);
      if (repositoryRequestIdRef.current !== requestId) return;
      hasLoadedRepositoriesRef.current = true;
      loadedRepositoryQueryRef.current = nextQuery;
      setCurrentUser(user);
      setRepositories(repoList);
    } catch {
      if (repositoryRequestIdRef.current !== requestId) return;
      setRepoError("仓库加载失败，请重试");
      if (isInitialLoad) {
        setRepositories([]);
      }
    } finally {
      if (repositoryRequestIdRef.current === requestId) {
        if (isInitialLoad) {
          setLoadingRepos(false);
        } else {
          setSearchingRepos(false);
        }
      }
    }
  }, [clearSelectedRepository, onboardingClient]);

  useEffect(() => {
    if (!query.trim()) {
      setActiveQuery("");
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    void loadRepositories(activeQuery);
  }, [activeQuery, loadRepositories]);

  useEffect(() => {
    if (!selectedRepository) return;

    const stillVisible = repositories.some((repository) => repository.id === selectedRepository.id);
    if (stillVisible) return;

    clearSelectedRepository();
  }, [clearSelectedRepository, repositories, selectedRepository]);

  useEffect(() => {
    if (!reauthorizationDeviceFlow || !onboardingClient.getAuthSession) return;

    let active = true;
    const timer = window.setInterval(async () => {
      try {
        const nextSession = await onboardingClient.getAuthSession?.();
        if (!active || !nextSession) return;

        setReauthorizationSession(nextSession);
        if (nextSession.state === "authenticated") {
          window.clearInterval(timer);
          setReauthorizing(false);
          await loadRepositories(activeQuery);
        } else if (nextSession.state === "error") {
          window.clearInterval(timer);
          setReauthorizing(false);
          setReauthorizeError(getAuthErrorMessage(nextSession.error));
        }
      } catch {
        if (active) {
          window.clearInterval(timer);
          setReauthorizing(false);
          setReauthorizeError("GitHub 授权状态检查失败，请重试");
        }
      }
    }, Math.max(reauthorizationDeviceFlow.interval, 1) * 1000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [activeQuery, loadRepositories, onboardingClient, reauthorizationDeviceFlow]);

  const config = useMemo(() => {
    if (!validation?.ok || !selectedSelection) return null;
    return createConfigFromSelection(selectedSelection, validation);
  }, [selectedSelection, validation]);

  const validationError = getValidationErrorMessage(validation);
  const hasSearchQuery = query.trim().length > 0;

  async function validateSelection(selection: RepositorySelection, repository?: RepositoryOption) {
    const requestId = validationRequestIdRef.current + 1;
    validationRequestIdRef.current = requestId;
    setSelectedRepoId(repository?.id ?? "");
    setSelectedRepository(repository ?? null);
    setSelectedSelection(selection);
    setValidation(null);
    setValidating(true);
    setSaveError("");
    try {
      const nextValidation = await onboardingClient.validateRepository(selection);
      if (validationRequestIdRef.current !== requestId) return;
      setValidation(nextValidation);
    } catch {
      if (validationRequestIdRef.current !== requestId) return;
      setValidation({
        ok: false,
        checks: [],
        error: "NETWORK_ERROR",
      });
    } finally {
      if (validationRequestIdRef.current === requestId) {
        setValidating(false);
      }
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
    setReauthorizing(true);
    setReauthorizationSession(null);
    setReauthorizeError("");
    let waitingForDeviceFlow = false;
    try {
      const nextSession = await onboardingClient.reauthorize();
      setReauthorizationSession(nextSession ?? null);

      if (nextSession?.state === "error") {
        setReauthorizeError(getAuthErrorMessage(nextSession.error));
        return;
      }

      waitingForDeviceFlow = Boolean(nextSession?.deviceFlow);
      if (waitingForDeviceFlow) return;

      await loadRepositories(activeQuery);
    } catch {
      setReauthorizeError("重新授权失败，请重试");
    } finally {
      if (!waitingForDeviceFlow) setReauthorizing(false);
    }
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    setSaveError("");
    try {
      await onboardingClient.saveRepositoryConfig(config);
      navigate({ to: "/" });
    } catch {
      setSaveError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  function handleSearchSubmit() {
    const nextQuery = query.trim() ? query : "";
    if (nextQuery === activeQuery) return;
    setActiveQuery(nextQuery);
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
            <div className="flex flex-col items-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleReauthorize()}
                disabled={reauthorizing}
              >
                <RefreshCw className={`h-4 w-4 ${reauthorizing ? "animate-spin" : ""}`} />
                {reauthorizationDeviceFlow ? "等待授权" : "重新授权"}
              </Button>
              {reauthorizeError && (
                <p className="text-xs text-[var(--status-error)]">{reauthorizeError}</p>
              )}
              {reauthorizationDeviceFlow && (
                <div className="w-56 rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3 text-center">
                  <p className="text-xs text-[var(--text-secondary)]">在 GitHub 页面输入授权码</p>
                  <div className="mt-2 rounded-md bg-[var(--bg-card)] px-3 py-2 font-mono text-xl font-bold tracking-widest text-[var(--text-primary)]">
                    {reauthorizationDeviceFlow.userCode}
                  </div>
                  <a
                    href={reauthorizationDeviceFlow.verificationUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-2 text-xs font-medium text-[var(--brand-primary)] hover:underline"
                  >
                    打开 GitHub 授权页面
                    <ArrowRight size={12} />
                  </a>
                </div>
              )}
            </div>
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
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                    event.preventDefault();
                    handleSearchSubmit();
                  }}
                  placeholder="搜索仓库"
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
                />
                {searchingRepos ? (
                  <Loader2
                    aria-label="正在搜索仓库"
                    className="h-4 w-4 flex-shrink-0 animate-spin text-[var(--text-tertiary)]"
                  />
                ) : null}
              </div>
              {repoError && !loadingRepos && repositories.length > 0 ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--status-error)]">{repoError}</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-xs"
                    onClick={() => void loadRepositories(activeQuery)}
                    disabled={searchingRepos}
                    aria-label="重试搜索"
                  >
                    重试
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="min-h-72 max-h-96 overflow-y-auto divide-y divide-[var(--border-default)]"> 
              {loadingRepos ? (
                <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在读取仓库
                </div>
              ) : repositories.length > 0 ? (
                repositories.map((repository) => (
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
                    {hasSearchQuery ? "未找到匹配的仓库" : "未找到可写仓库，请检查 GitHub 授权权限"}
                  </p>
                  {repoError && <p className="text-xs text-[var(--status-error)]">{repoError}</p>}
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadRepositories(activeQuery)}>
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
                  <Input
                    type="text"
                    value={manualOwner}
                    onChange={(event) => setManualOwner(event.target.value)}
                    placeholder="owner"
                    aria-label="仓库所有者"
                  />
                  <Input
                    type="text"
                    value={manualRepo}
                    onChange={(event) => setManualRepo(event.target.value)}
                    placeholder="repo"
                    aria-label="仓库名称"
                  />
                  <Input
                    type="text"
                    value={manualBranch}
                    onChange={(event) => setManualBranch(event.target.value)}
                    placeholder="main"
                    aria-label="分支"
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
                        {saveError && (
                          <p className="text-sm text-[var(--status-error)]">{saveError}</p>
                        )}
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
