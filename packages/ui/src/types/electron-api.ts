export interface ElectronAPI {
  getToken: () => Promise<string | null>;
  setToken: (token: string) => Promise<boolean>;
  deleteToken: () => Promise<boolean>;
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
}
