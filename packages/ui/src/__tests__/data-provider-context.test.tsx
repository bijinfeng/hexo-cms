import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataProviderProvider, useDataProvider } from '../context/data-provider-context';
import type { DataProvider } from '@hexo-cms/core';

function createMockProvider(): DataProvider {
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
  };
}

function ConsumerComponent() {
  const provider = useDataProvider();
  return <div data-testid="provider-exists">{provider ? 'has-provider' : 'no-provider'}</div>;
}

describe('DataProviderContext', () => {
  describe('DataProviderProvider', () => {
    it('should render children', () => {
      const mockProvider = createMockProvider();
      render(
        <DataProviderProvider provider={mockProvider}>
          <div data-testid="child">child content</div>
        </DataProviderProvider>
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should provide the provider to consumers', () => {
      const mockProvider = createMockProvider();
      render(
        <DataProviderProvider provider={mockProvider}>
          <ConsumerComponent />
        </DataProviderProvider>
      );
      expect(screen.getByTestId('provider-exists')).toHaveTextContent('has-provider');
    });
  });

  describe('useDataProvider', () => {
    it('should throw when used outside DataProviderProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => render(<ConsumerComponent />)).toThrow(
        'useDataProvider must be used within DataProviderProvider'
      );
      consoleError.mockRestore();
    });

    it('should return the provider instance', () => {
      const mockProvider = createMockProvider();
      let capturedProvider: DataProvider | null = null;

      function CapturingComponent() {
        capturedProvider = useDataProvider();
        return null;
      }

      render(
        <DataProviderProvider provider={mockProvider}>
          <CapturingComponent />
        </DataProviderProvider>
      );

      expect(capturedProvider).toBe(mockProvider);
    });
  });
});
