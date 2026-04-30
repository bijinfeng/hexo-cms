declare global {
  interface Window {
    electronAPI: {
      getToken: () => Promise<string | null>;
      setToken: (token: string) => Promise<boolean>;
      deleteToken: () => Promise<boolean>;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
    };
  }
}

export {};
