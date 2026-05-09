import type { AuthSession } from "./auth";

export interface ElectronAPI {
  getSession: () => Promise<AuthSession>;
  startDeviceFlow: () => Promise<AuthSession>;
  signOut: () => Promise<void>;
  reauthorize: () => Promise<AuthSession>;
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
}
