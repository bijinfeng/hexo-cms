import type { AuthSession } from "./auth";
import type {
  RepositoryListInput,
  RepositoryOption,
  RepositorySelection,
  RepositoryValidation,
} from "./onboarding";

export const ELECTRON_IPC_CHANNELS = [
  "auth:getSession",
  "auth:startDeviceFlow",
  "auth:signOut",
  "auth:reauthorize",
  "onboarding:listRepositories",
  "onboarding:validateRepository",
  "config:get",
  "config:save",
  "github:get-posts",
  "github:get-post",
  "github:save-post",
  "github:delete-post",
  "github:get-pages",
  "github:get-page",
  "github:save-page",
  "github:delete-page",
  "github:get-tags",
  "github:rename-tag",
  "github:delete-tag",
  "github:get-media",
  "github:upload-media",
  "github:delete-media",
  "github:get-stats",
  "github:get-themes",
  "github:switch-theme",
  "github:get-deployments",
  "github:trigger-deploy",
  "github:read-config-file",
  "github:write-config-file",
  "plugin-storage:load",
  "plugin-storage:save",
  "plugin-secret:load",
  "plugin-secret:save",
  "plugin-secret:has",
  "plugin-secret:mutate",
  "plugin-http:fetch",
  "plugin-network-audit:list",
  "plugin-state:load",
  "plugin-state:save",
  "plugin-config:load",
  "plugin-config:save",
  "plugin-logs:load",
  "plugin-logs:save",
  "window:minimize",
  "window:maximize",
  "window:unmaximize",
  "window:close",
  "window:isMaximized",
  "update:check",
  "update:download",
  "update:install",
  "update:set-channel",
  "update:get-version",
] as const;

export type ElectronIpcChannel = (typeof ELECTRON_IPC_CHANNELS)[number];

export type UpdateChannel = "stable" | "beta";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatusPayload {
  status: UpdateStatus;
  version?: string;
  releaseDate?: string;
  percent?: number;
  bytesPerSecond?: number;
  message?: string;
}

const ELECTRON_IPC_CHANNEL_SET = new Set<string>(ELECTRON_IPC_CHANNELS);

export function isElectronIpcChannel(channel: string): channel is ElectronIpcChannel {
  return ELECTRON_IPC_CHANNEL_SET.has(channel);
}

export interface ElectronAPI {
  getSession: () => Promise<AuthSession>;
  startDeviceFlow: () => Promise<AuthSession>;
  signOut: () => Promise<void>;
  reauthorize: () => Promise<AuthSession>;
  listOnboardingRepositories: (input: RepositoryListInput) => Promise<RepositoryOption[]>;
  validateOnboardingRepository: (input: RepositorySelection) => Promise<RepositoryValidation>;
  invoke: <T = unknown>(channel: ElectronIpcChannel, ...args: unknown[]) => Promise<T>;
  onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => () => void;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  quitAndInstall: () => Promise<void>;
  setUpdateChannel: (channel: UpdateChannel) => Promise<void>;
  getVersion: () => Promise<{ version: string; channel: UpdateChannel }>;
}
