import type { AuthSession } from "./auth";
import type {
  RepositoryListInput,
  RepositoryOption,
  RepositorySelection,
  RepositoryValidation,
} from "./onboarding";

export interface ElectronAPI {
  getSession: () => Promise<AuthSession>;
  startDeviceFlow: () => Promise<AuthSession>;
  signOut: () => Promise<void>;
  reauthorize: () => Promise<AuthSession>;
  listOnboardingRepositories: (input: RepositoryListInput) => Promise<RepositoryOption[]>;
  validateOnboardingRepository: (input: RepositorySelection) => Promise<RepositoryValidation>;
  invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
}
