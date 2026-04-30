import type { DataProvider } from "@hexo-cms/core";
import type { HexoPost, GitHubConfig } from "@hexo-cms/core";

/**
 * DesktopDataProvider
 *
 * 桌面端 DataProvider 实现，通过 Electron IPC 调用主进程
 */
export class DesktopDataProvider implements DataProvider {
  // ==================== 配置管理 ====================

  async getConfig(): Promise<GitHubConfig | null> {
    return window.electronAPI.invoke("config:get");
  }

  async saveConfig(config: GitHubConfig): Promise<void> {
    await window.electronAPI.invoke("config:save", config);
  }

  // ==================== Token 管理 ====================

  async getToken(): Promise<string | null> {
    return window.electronAPI.invoke("get-token");
  }

  async saveToken(token: string): Promise<void> {
    await window.electronAPI.invoke("set-token", token);
  }

  async deleteToken(): Promise<void> {
    await window.electronAPI.invoke("delete-token");
  }

  // ==================== 文章管理 ====================

  async getPosts(): Promise<HexoPost[]> {
    return window.electronAPI.invoke("github:get-posts");
  }

  async getPost(path: string): Promise<HexoPost> {
    return window.electronAPI.invoke("github:get-post", path);
  }

  async savePost(post: HexoPost): Promise<void> {
    await window.electronAPI.invoke("github:save-post", post);
  }

  async deletePost(path: string): Promise<void> {
    await window.electronAPI.invoke("github:delete-post", path);
  }

  // ==================== 页面管理 ====================

  async getPages(): Promise<HexoPost[]> {
    return window.electronAPI.invoke("github:get-pages");
  }

  async getPage(path: string): Promise<HexoPost> {
    return window.electronAPI.invoke("github:get-page", path);
  }

  async savePage(post: HexoPost): Promise<void> {
    await window.electronAPI.invoke("github:save-page", post);
  }

  async deletePage(path: string): Promise<void> {
    await window.electronAPI.invoke("github:delete-page", path);
  }

  // ==================== 标签和分类管理 ====================

  async getTags(): Promise<{
    tags: Array<{ id: string; name: string; slug: string; count: number }>;
    categories: Array<{ id: string; name: string; slug: string; count: number }>;
    total: number;
  }> {
    return window.electronAPI.invoke("github:get-tags");
  }

  async renameTag(type: "tag" | "category", oldName: string, newName: string): Promise<{ updatedCount: number }> {
    return window.electronAPI.invoke("github:rename-tag", { type, oldName, newName });
  }

  async deleteTag(type: "tag" | "category", name: string): Promise<{ updatedCount: number }> {
    return window.electronAPI.invoke("github:delete-tag", { type, name });
  }

  // ==================== 媒体管理 ====================

  async getMediaFiles(): Promise<Array<{ name: string; path: string; size: number; url: string; sha: string }>> {
    return window.electronAPI.invoke("github:get-media");
  }

  async uploadMedia(file: File, path: string): Promise<{ url: string }> {
    // 将 File 转换为 ArrayBuffer 以便通过 IPC 传输
    const buffer = await file.arrayBuffer();
    return window.electronAPI.invoke("github:upload-media", { buffer, path, name: file.name, type: file.type });
  }

  async deleteMedia(path: string): Promise<void> {
    await window.electronAPI.invoke("github:delete-media", path);
  }

  // ==================== 统计数据 ====================

  async getStats(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    totalViews: number;
  }> {
    return window.electronAPI.invoke("github:get-stats");
  }

  // ==================== 主题管理 ====================

  async getThemes(): Promise<{
    currentTheme: string;
    installedThemes: Array<{ name: string; path: string }>;
  }> {
    return window.electronAPI.invoke("github:get-themes");
  }

  async switchTheme(themeName: string): Promise<void> {
    await window.electronAPI.invoke("github:switch-theme", themeName);
  }

  // ==================== 部署管理 ====================

  async getDeployments(): Promise<Array<{
    id: string;
    status: string;
    createdAt: string;
    duration: number;
    conclusion: string;
  }>> {
    return window.electronAPI.invoke("github:get-deployments");
  }

  async triggerDeploy(workflowFile: string): Promise<void> {
    await window.electronAPI.invoke("github:trigger-deploy", workflowFile);
  }
}
