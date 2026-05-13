import { requireElectronAPI } from "@hexo-cms/ui/lib/electron-api";
import type { AuthClient } from "@hexo-cms/ui/types/auth";

const listeners = new Set<() => void>();

function notifyAuthChanged() {
  for (const listener of listeners) {
    listener();
  }
}

export const desktopAuthClient: AuthClient = {
  getSession() {
    return requireElectronAPI().getSession();
  },
  async startLogin() {
    const session = await requireElectronAPI().startDeviceFlow();
    notifyAuthChanged();
    return session;
  },
  async signOut() {
    await requireElectronAPI().signOut();
    notifyAuthChanged();
  },
  async reauthorize() {
    const session = await requireElectronAPI().reauthorize();
    notifyAuthChanged();
    return session;
  },
};

export function subscribeToDesktopAuthChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
