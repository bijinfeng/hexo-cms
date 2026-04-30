import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PostsPage } from '../pages/posts';
import { DataProviderProvider } from '../context/data-provider-context';
import type { DataProvider } from '@hexo-cms/core';

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

function createMockProvider(overrides: Partial<DataProvider> = {}): DataProvider {
  return {
    getConfig: vi.fn().mockResolvedValue(null),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    getToken: vi.fn().mockResolvedValue(null),
    saveToken: vi.fn().mockResolvedValue(undefined),
    deleteToken: vi.fn().mockResolvedValue(undefined),
    getPosts: vi.fn().mockResolvedValue([]),
    getPost: vi.fn().mockResolvedValue(null),
    savePost: vi.fn().mockResolvedValue(undefined),
    deletePost: vi.fn().mockResolvedValue(undefined),
    getPages: vi.fn().mockResolvedValue([]),
    getPage: vi.fn().mockResolvedValue(null),
    savePage: vi.fn().mockResolvedValue(undefined),
    deletePage: vi.fn().mockResolvedValue(undefined),
    getTags: vi.fn().mockResolvedValue({ tags: [], categories: [], total: 0 }),
    renameTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    deleteTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    getMediaFiles: vi.fn().mockResolvedValue([]),
    uploadMedia: vi.fn().mockResolvedValue({ url: '' }),
    deleteMedia: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 }),
    getThemes: vi.fn().mockResolvedValue({ currentTheme: '', installedThemes: [] }),
    switchTheme: vi.fn().mockResolvedValue(undefined),
    getDeployments: vi.fn().mockResolvedValue([]),
    triggerDeploy: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderWithProvider(provider: DataProvider) {
  return render(
    <DataProviderProvider provider={provider}>
      <PostsPage />
    </DataProviderProvider>
  );
}

describe('PostsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page heading', async () => {
    const provider = createMockProvider();
    renderWithProvider(provider);
    expect(screen.getByText('文章管理')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    const provider = createMockProvider({
      getPosts: vi.fn().mockImplementation(() => new Promise(() => {})),
    });
    renderWithProvider(provider);
    // Loading spinner should be visible
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('should render posts after loading', async () => {
    const provider = createMockProvider({
      getPosts: vi.fn().mockResolvedValue([
        {
          path: 'source/_posts/hello-world.md',
          title: 'Hello World',
          date: '2024-01-01',
          content: 'Content',
          frontmatter: { title: 'Hello World', date: '2024-01-01' },
        },
      ]),
    });
    renderWithProvider(provider);

    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });
  });

  it('should render empty state when no posts', async () => {
    const provider = createMockProvider({ getPosts: vi.fn().mockResolvedValue([]) });
    renderWithProvider(provider);

    await waitFor(() => {
      expect(screen.getByText('没有找到匹配的文章')).toBeInTheDocument();
    });
  });

  it('should call getPosts on mount', async () => {
    const getPosts = vi.fn().mockResolvedValue([]);
    const provider = createMockProvider({ getPosts });
    renderWithProvider(provider);

    await waitFor(() => {
      expect(getPosts).toHaveBeenCalledTimes(1);
    });
  });

  it('should render new post button', async () => {
    const provider = createMockProvider();
    renderWithProvider(provider);

    await waitFor(() => {
      expect(screen.getByText('新建文章')).toBeInTheDocument();
    });
  });

  it('should render search input', () => {
    const provider = createMockProvider();
    renderWithProvider(provider);
    expect(screen.getByPlaceholderText('搜索标题、标签、内容、分类...')).toBeInTheDocument();
  });
});
