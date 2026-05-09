export type AuthState =
  | "anonymous"
  | "authenticating"
  | "authenticated"
  | "reauthorization_required"
  | "error";

export interface AuthUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  login?: string | null;
  avatarUrl?: string | null;
}

export interface DeviceFlowInfo {
  userCode: string;
  verificationUri: string;
  expiresAt: string;
  interval: number;
}

export interface AuthSession {
  state: AuthState;
  user?: AuthUser | null;
  deviceFlow?: DeviceFlowInfo;
  error?: string;
}

export interface AuthClient {
  getSession: () => Promise<AuthSession>;
  startLogin: () => Promise<AuthSession>;
  signOut: () => Promise<void>;
  reauthorize: () => Promise<AuthSession>;
}
