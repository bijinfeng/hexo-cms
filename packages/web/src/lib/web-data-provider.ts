import { DataProviderError, DataProviderErrorCode } from "@hexo-cms/core";
import type { DataProvider, HexoPost, GitHubConfig } from "@hexo-cms/core";

class WebDataProviderError extends DataProviderError {
  constructor(message: string, code: DataProviderErrorCode, statusCode?: number, originalError?: Error) {
    super(message, code, statusCode, originalError);
    this.name = "WebDataProviderError";
  }
}

async function checkResponse(res: Response, operation: string): Promise<void> {
  if (res.ok) return;
  const status = res.status;
  if (status === 401 || status === 403) {
    throw new WebDataProviderError(`GitHub auth failed: ${res.statusText}`, DataProviderErrorCode.AUTH, status);
  }
  if (status === 429) {
    throw new WebDataProviderError("Rate limited", DataProviderErrorCode.RATE_LIMIT, status);
  }
  if (status === 404) {
    throw new WebDataProviderError(`Not found: ${operation}`, DataProviderErrorCode.NOT_FOUND, status);
  }
  throw new WebDataProviderError(`Request failed: ${operation} (${status})`, DataProviderErrorCode.NETWORK, status);
}

async function apiFetch(url: string, options?: Parameters<typeof fetch>[1] & { method?: string; headers?: Record<string, string>; body?: unknown }): Promise<Response> {
  try {
    const res = await fetch(url, options);
    await checkResponse(res, url);
    return res;
  } catch (error) {
    if (error instanceof WebDataProviderError) throw error;
    if (error instanceof TypeError && (error as Error).message === "Failed to fetch") {
      throw new WebDataProviderError("Network error: unable to reach server", DataProviderErrorCode.NETWORK, undefined, error as Error);
    }
    if (error instanceof DataProviderError) throw error;
    throw new WebDataProviderError(`Request failed: ${url}`, DataProviderErrorCode.NETWORK, undefined, error as Error);
  }
}

async function optionalApiFetch(url: string): Promise<Response | null> {
  try {
    return await apiFetch(url);
  } catch (error) {
    if (DataProviderError.isAuthError(error)) throw error;
    return null;
  }
}

export class WebDataProvider implements DataProvider {
  async getConfig(): Promise<GitHubConfig | null> {
    const res = await optionalApiFetch("/api/github/config");
    if (!res) return null;
    const data = await res.json();
    return data.config ?? null;
  }

  async saveConfig(config: GitHubConfig): Promise<void> {
    await apiFetch("/api/github/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
  }

  // ==================== Token 管理 ====================

  async getToken(): Promise<string | null> {
    const res = await optionalApiFetch("/api/auth/token");
    if (!res) return null;
    const data = await res.json();
    return data.authenticated ? "oauth-session" : null;
  }

  async saveToken(_token: string): Promise<void> {
    // Web 端 token 由 OAuth 管理
  }

  async deleteToken(): Promise<void> {
    // Web 端 token 由 OAuth 管理
  }

  // ==================== 文章管理 ====================

  async getPosts(): Promise<HexoPost[]> {
    const res = await optionalApiFetch("/api/github/posts");
    if (!res) return [];
    const data = await res.json();
    return data.posts ?? [];
  }

  async getPost(path: string): Promise<HexoPost> {
    const res = await apiFetch(`/api/github/posts?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    return data.post;
  }

  async savePost(post: HexoPost): Promise<void> {
    await apiFetch("/api/github/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  }

  async deletePost(path: string): Promise<void> {
    await apiFetch("/api/github/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }

  // ==================== 页面管理 ====================

  async getPages(): Promise<HexoPost[]> {
    const res = await optionalApiFetch("/api/github/pages");
    if (!res) return [];
    const data = await res.json();
    return data.pages ?? [];
  }

  async getPage(path: string): Promise<HexoPost> {
    const res = await apiFetch(`/api/github/pages?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    return data.page;
  }

  async savePage(post: HexoPost): Promise<void> {
    await apiFetch("/api/github/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(post),
    });
  }

  async deletePage(path: string): Promise<void> {
    await apiFetch("/api/github/pages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }

  // ==================== 标签和分类管理 ====================

  async getTags(): Promise<{
    tags: Array<{ id: string; name: string; slug: string; count: number }>;
    categories: Array<{ id: string; name: string; slug: string; count: number }>;
    total: number;
  }> {
    const res = await optionalApiFetch("/api/github/tags");
    if (!res) return { tags: [], categories: [], total: 0 };
    return res.json();
  }

  async renameTag(type: "tag" | "category", oldName: string, newName: string): Promise<{ updatedCount: number }> {
    const res = await apiFetch("/api/github/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, oldName, newName }),
    });
    return res.json();
  }

  async deleteTag(type: "tag" | "category", name: string): Promise<{ updatedCount: number }> {
    const res = await apiFetch("/api/github/tags", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, name }),
    });
    return res.json();
  }

  // ==================== 媒体管理 ====================

  async getMediaFiles(): Promise<Array<{ name: string; path: string; size: number; url: string; sha: string }>> {
    const res = await optionalApiFetch("/api/github/media");
    if (!res) return [];
    const data = await res.json();
    return data.files ?? [];
  }

  async uploadMedia(file: File, path: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);
    const res = await apiFetch("/api/github/media", {
      method: "POST",
      body: formData,
    });
    return res.json();
  }

  async deleteMedia(path: string): Promise<void> {
    await apiFetch("/api/github/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
  }

  // ==================== 统计数据 ====================

  async getStats(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    totalViews: number;
  }> {
    const res = await optionalApiFetch("/api/github/stats");
    if (!res) return { totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 };
    return res.json();
  }

  // ==================== 主题管理 ====================

  async getThemes(): Promise<{ currentTheme: string; installedThemes: Array<{ name: string; path: string }> }> {
    const res = await optionalApiFetch("/api/github/themes");
    if (!res) return { currentTheme: "", installedThemes: [] };
    return res.json();
  }

  async switchTheme(themeName: string): Promise<void> {
    await apiFetch("/api/github/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: themeName }),
    });
  }

  // ==================== 部署管理 ====================

  async getDeployments(): Promise<Array<{ id: string; status: string; createdAt: string; duration: number; conclusion: string }>> {
    const res = await optionalApiFetch("/api/deploy");
    if (!res) return [];
    const data = await res.json();
    return data.runs ?? [];
  }

  async triggerDeploy(workflowFile: string): Promise<void> {
    await apiFetch("/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowFile }),
    });
  }
}
