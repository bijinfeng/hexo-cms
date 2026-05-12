import type { PluginFetch, PluginHttpAuditEntry } from "@hexo-cms/core";
import { BrowserPluginAuditLogStore } from "@hexo-cms/core";
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

// 全局审计日志存储
const auditLogStore = new BrowserPluginAuditLogStore();

function recordAuditLog(
  pluginId: string | undefined,
  url: string,
  method: string | undefined,
  requestHeaders: Record<string, string> | undefined,
  requestBody: string | undefined,
  result: { ok: boolean; status: number; statusText: string; headers: Record<string, string>; body: string } | null,
  error: string | null,
  startTime: number,
): void {
  if (!pluginId) return;

  const entry: PluginHttpAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    pluginId,
    timestamp: new Date().toISOString(),
    method: method ?? "GET",
    url,
    requestHeaders,
    requestBody,
    responseStatus: result?.status,
    responseStatusText: result?.statusText,
    responseHeaders: result?.headers,
    responseBody: result?.body,
    error: error ?? undefined,
    durationMs: Date.now() - startTime,
  };

  auditLogStore.append(entry);
}

export function getAuditLogStore() {
  return auditLogStore;
}

/**
 * Web 端通过 API route 代理执行网络请求
 */
export const webPluginFetch: PluginFetch = async (url, options) => {
  const startTime = Date.now();
  const request: PluginFetchRequest = {
    pluginId: options.pluginId,
    url,
    method: options.method,
    headers: options.headers,
    body: options.body,
    timeoutMs: 10_000,
  };

  try {
    const response = await fetch("/api/plugin/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      const errorMsg = error.error ?? "Plugin fetch failed";
      recordAuditLog(options.pluginId, url, options.method, options.headers, options.body, null, errorMsg, startTime);
      throw new Error(errorMsg);
    }

    const result = (await response.json()) as PluginFetchResponse;
    recordAuditLog(options.pluginId, url, options.method, options.headers, options.body, result, null, startTime);

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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    recordAuditLog(options.pluginId, url, options.method, options.headers, options.body, null, errorMsg, startTime);
    throw error;
  }
};

/**
 * Desktop 端通过 IPC 代理执行网络请求
 */
export const desktopPluginFetch: PluginFetch = async (url, options) => {
  const startTime = Date.now();
  const request: PluginFetchRequest = {
    pluginId: options.pluginId,
    url,
    method: options.method,
    headers: options.headers,
    body: options.body,
    timeoutMs: 10_000,
  };

  try {
    const result = await getElectronAPI()?.invoke<PluginFetchResponse>("plugin-http:fetch", request);

    if (!result) {
      const errorMsg = "Electron API not available";
      recordAuditLog(options.pluginId, url, options.method, options.headers, options.body, null, errorMsg, startTime);
      throw new Error(errorMsg);
    }

    recordAuditLog(options.pluginId, url, options.method, options.headers, options.body, result, null, startTime);

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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    recordAuditLog(options.pluginId, url, options.method, options.headers, options.body, null, errorMsg, startTime);
    throw error;
  }
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
