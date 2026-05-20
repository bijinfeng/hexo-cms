import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PagesPage } from '../pages/pages';
import { DataProviderProvider } from '../context/data-provider-context';
import type { DataProvider } from '@hexo-cms/core';
import { I18nTestWrapper } from './i18n-test-wrapper';

const routerState = vi.hoisted(() => ({
  pathname: '/pages',
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useRouterState: () => ({ location: { pathname: routerState.pathname } }),
  Outlet: () => <div data-testid="nested-page-route" />,
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
    mergeTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    getMediaFiles: vi.fn().mockResolvedValue([]),
    uploadMedia: vi.fn().mockResolvedValue({ url: '' }),
    deleteMedia: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 }),
    getThemes: vi.fn().mockResolvedValue({ currentTheme: '', installedThemes: [] }),
    switchTheme: vi.fn().mockResolvedValue(undefined),
    getDeployments: vi.fn().mockResolvedValue([]),
    triggerDeploy: vi.fn().mockResolvedValue(undefined),
    readConfigFile: vi.fn().mockResolvedValue(""),
    writeConfigFile: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderWithProvider(provider: DataProvider) {
  return render(
    <I18nTestWrapper>
      <DataProviderProvider provider={provider}>
        <PagesPage />
      </DataProviderProvider>
    </I18nTestWrapper>
  );
}

describe('PagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerState.pathname = '/pages';
  });

  it('should render child route content for new page route', () => {
    const provider = createMockProvider();
    routerState.pathname = '/pages/new';

    renderWithProvider(provider);

    expect(screen.getByTestId('nested-page-route')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '页面管理' })).not.toBeInTheDocument();
    expect(provider.getPages).not.toHaveBeenCalled();
  });
});
