import type { PluginFetch } from "@hexo-cms/core";
import { getElectronAPI } from "../lib/electron-api";

interface PluginFetchRequest {
  pluginId?: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

interface PluginFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

/**
 * Web 端通过 API route 代理执行网络请求
 */
export const webPluginFetch: PluginFetch = async (url, options) => {
  const request: PluginFetchRequest = {
    pluginId: options.pluginId,
    url,
    method: options.method,
    headers: options.headers,
    body: options.body,
    timeoutMs: 10_000,
  };

  const response = await fetch("/api/plugin/fetch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
    throw new Error(error.error ?? "Plugin fetch failed");
  }

  const result = (await response.json()) as PluginFetchResponse;

  return {
    ok: result.ok,
    status: result.status,
    statusText: result.statusText,
    headers: {
      get: (name: string) => result.headers[name.toLowerCase()] ?? null,
    },
    json: async () => JSON.parse(result.body),
    text: async () => result.body,
  };
};

/**
 * Desktop 端通过 IPC 代理执行网络请求
 */
export const desktopPluginFetch: PluginFetch = async (url, options) => {
  const request: PluginFetchRequest = {
    pluginId: options.pluginId,
    url,
    method: options.method,
    headers: options.headers,
    body: options.body,
    timeoutMs: 10_000,
  };

  const result = await getElectronAPI()?.invoke<PluginFetchResponse>("plugin-http:fetch", request);

  if (!result) {
    throw new Error("Electron API not available");
  }

  return {
    ok: result.ok,
    status: result.status,
    statusText: result.statusText,
    headers: {
      get: (name: string) => result.headers[name.toLowerCase()] ?? null,
    },
    json: async () => JSON.parse(result.body),
    text: async () => result.body,
  };
};

/**
 * 创建平台适配的 PluginFetch 实现
 */
export function createPlatformPluginFetch(): PluginFetch {
  if (typeof window === "undefined") {
    return async () => {
      throw new Error("Plugin fetch is not available in SSR");
    };
  }

  if (getElectronAPI()) {
    return desktopPluginFetch;
  }

  if (typeof fetch === "function") {
    return webPluginFetch;
  }

  return async () => {
    throw new Error("No fetch implementation available");
  };
}
