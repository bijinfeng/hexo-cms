import { createContext, useContext } from 'react';
import type { DataProvider } from '@hexo-cms/core';
import type { HexoPost } from '@hexo-cms/core';

const DataProviderContext = createContext<DataProvider | null>(null);

const STUB_PROVIDER: DataProvider = {
  getConfig: () => Promise.resolve(null),
  saveConfig: () => Promise.resolve(),
  getToken: () => Promise.resolve(null),
  saveToken: () => Promise.resolve(),
  deleteToken: () => Promise.resolve(),
  getPosts: () => Promise.resolve([]),
  getPost: () => Promise.resolve({} as HexoPost),
  savePost: () => Promise.resolve(),
  deletePost: () => Promise.resolve(),
  getPages: () => Promise.resolve([]),
  getPage: () => Promise.resolve({} as HexoPost),
  savePage: () => Promise.resolve(),
  deletePage: () => Promise.resolve(),
  getTags: () => Promise.resolve({ tags: [], categories: [], total: 0 }),
  renameTag: () => Promise.resolve({ updatedCount: 0 }),
  deleteTag: () => Promise.resolve({ updatedCount: 0 }),
  mergeTag: () => Promise.resolve({ updatedCount: 0 }),
  getMediaFiles: () => Promise.resolve([]),
  uploadMedia: () => Promise.resolve({ url: '' }),
  deleteMedia: () => Promise.resolve(),
  getStats: () => Promise.resolve({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 }),
  getThemes: () => Promise.resolve({ currentTheme: '', installedThemes: [] }),
  switchTheme: () => Promise.resolve(),
  getDeployments: () => Promise.resolve([]),
  triggerDeploy: () => Promise.resolve(),
  readConfigFile: () => Promise.resolve(""),
  writeConfigFile: () => Promise.resolve(),
};

export function DataProviderProvider({ children, provider }: {
  children: React.ReactNode;
  provider: DataProvider;
}) {
  return (
    <DataProviderContext.Provider value={provider}>
      {children}
    </DataProviderContext.Provider>
  );
}

export function useDataProvider(): DataProvider {
  const provider = useContext(DataProviderContext);
  if (!provider) {
    console.warn('[hexo-cms] useDataProvider called outside DataProviderProvider — using stub provider');
    return STUB_PROVIDER;
  }
  return provider;
}
