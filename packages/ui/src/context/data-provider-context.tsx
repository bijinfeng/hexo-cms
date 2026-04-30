import { createContext, useContext } from 'react';
import type { DataProvider } from '@hexo-cms/core';

const DataProviderContext = createContext<DataProvider | null>(null);

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
    throw new Error('useDataProvider must be used within DataProviderProvider');
  }
  return provider;
}
