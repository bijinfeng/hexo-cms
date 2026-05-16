/**
 * Data Provider Interface
 *
 * 抽象数据访问层，Web 端和桌面端分别实现
 * 遵循业界最佳实践（Notion、VS Code 等）
 */

import type { HexoPost, GitHubConfig } from "./types";

export interface DataProvider {
  // ==================== 配置管理 ====================

  /**
   * 获取 GitHub 仓库配置
   */
  getConfig(): Promise<GitHubConfig | null>;

  /**
   * 保存 GitHub 仓库配置
   */
  saveConfig(config: GitHubConfig): Promise<void>;

  // ==================== Token 管理 ====================

  /**
   * 获取 GitHub Access Token
   */
  getToken(): Promise<string | null>;

  /**
   * 保存 GitHub Access Token
   */
  saveToken(token: string): Promise<void>;

  /**
   * 删除 GitHub Access Token
   */
  deleteToken(): Promise<void>;

  // ==================== 文章管理 ====================

  /**
   * 获取所有文章列表
   */
  getPosts(): Promise<HexoPost[]>;

  /**
   * 获取单篇文章详情
   */
  getPost(path: string): Promise<HexoPost>;

  /**
   * 保存文章（创建或更新）
   */
  savePost(post: HexoPost): Promise<void>;

  /**
   * 删除文章
   */
  deletePost(path: string): Promise<void>;

  // ==================== 页面管理 ====================

  /**
   * 获取所有页面列表
   */
  getPages(): Promise<HexoPost[]>;

  /**
   * 获取单个页面详情
   */
  getPage(path: string): Promise<HexoPost>;

  /**
   * 保存页面（创建或更新）
   */
  savePage(post: HexoPost): Promise<void>;

  /**
   * 删除页面
   */
  deletePage(path: string): Promise<void>;

  // ==================== 标签和分类管理 ====================

  /**
   * 获取标签和分类统计
   */
  getTags(): Promise<{
    tags: Array<{ id: string; name: string; slug: string; count: number }>;
    categories: Array<{ id: string; name: string; slug: string; count: number }>;
    total: number;
  }>;

  /**
   * 重命名标签或分类
   */
  renameTag(type: "tag" | "category", oldName: string, newName: string): Promise<{ updatedCount: number }>;

  /**
   * 删除标签或分类
   */
  deleteTag(type: "tag" | "category", name: string): Promise<{ updatedCount: number }>;

  /**
   * 合并标签或分类（将 sourceName 合并到 targetName）
   */
  mergeTag(type: "tag" | "category", sourceName: string, targetName: string): Promise<{ updatedCount: number }>;

  // ==================== 媒体管理 ====================

  /**
   * 获取媒体文件列表
   */
  getMediaFiles(): Promise<Array<{
    name: string;
    path: string;
    size: number;
    url: string;
    sha: string;
  }>>;

  /**
   * 上传媒体文件
   */
  uploadMedia(file: File, path: string): Promise<{ url: string }>;

  /**
   * 删除媒体文件
   */
  deleteMedia(path: string): Promise<void>;

  // ==================== 统计数据 ====================

  /**
   * 获取仪表板统计数据
   */
  getStats(): Promise<{
    totalPosts: number;
    publishedPosts: number;
    draftPosts: number;
    totalViews: number;
  }>;

  // ==================== 主题管理 ====================

  /**
   * 获取主题列表和当前主题
   */
  getThemes(): Promise<{
    currentTheme: string;
    installedThemes: Array<{ name: string; path: string }>;
  }>;

  /**
   * 切换主题
   */
  switchTheme(themeName: string): Promise<void>;

  // ==================== 部署管理 ====================

  /**
   * 获取部署历史
   */
  getDeployments(): Promise<Array<{
    id: string;
    status: string;
    createdAt: string;
    duration: number;
    conclusion: string;
  }>>;

  /**
   * 手动触发部署
   */
  triggerDeploy(workflowFile: string): Promise<void>;

  // ==================== 配置文件管理 ====================

  /**
   * 读取仓库中的原始文件内容
   */
  readConfigFile(path: string): Promise<string>;

  /**
   * 写入仓库中的原始文件
   */
  writeConfigFile(path: string, content: string): Promise<void>;
}
