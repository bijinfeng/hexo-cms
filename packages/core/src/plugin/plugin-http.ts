import type { PluginHttpAPI, PluginHttpRequestOptions, PluginManifest, PluginPermission } from "./types";

export interface PluginFetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers?: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type PluginFetch = (
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: unknown;
    credentials?: "omit";
    pluginId?: string;
  },
) => Promise<PluginFetchResponse>;

export function createPluginHttpAPI(
  pluginId: string,
  manifest: PluginManifest,
  permissionBroker: { assert(pluginId: string, permission: PluginPermission, operation: string): void },
  fetchImpl: PluginFetch = defaultFetch,
): PluginHttpAPI {
  return {
    async fetch<T = unknown>(url: string, options: PluginHttpRequestOptions = {}): Promise<T> {
      permissionBroker.assert(pluginId, "network.fetch", "plugin.http.fetch");
      const target = assertAllowedUrl(url, manifest.network?.allowedHosts ?? []);
      const timeoutMs = options.timeoutMs ?? 10_000;
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
        throw new Error("Plugin HTTP timeout must be a positive number");
      }

      const controller =
        typeof globalThis.AbortController === "function" ? new globalThis.AbortController() : undefined;
      const timeout = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

      try {
        const response = await fetchImpl(target.toString(), {
          method: options.method ?? "GET",
          headers: sanitizeHeaders(options.headers),
          body: options.body,
          signal: controller?.signal,
          credentials: "omit",
          pluginId,
        });

        if (!response.ok) {
          throw new Error(`Plugin HTTP request failed with ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers?.get("content-type") ?? "";
        if (contentType.toLowerCase().includes("application/json")) {
          return (await response.json()) as T;
        }

        return (await response.text()) as T;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    },
  };
}

function assertAllowedUrl(value: string, allowedHosts: string[]): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Plugin HTTP requests must use HTTPS");
  }
  const hostname = url.hostname.toLowerCase();
  const allowed = allowedHosts.some((host) => hostMatches(hostname, host));
  if (!allowed) {
    throw new Error(`Plugin HTTP host is not allowed: ${hostname}`);
  }
  return url;
}

function hostMatches(hostname: string, allowedHost: string): boolean {
  const normalized = allowedHost.toLowerCase();
  if (normalized.startsWith("*.")) {
    const suffix = normalized.slice(1);
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }
  return hostname === normalized;
}

function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return undefined;
  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => {
      const normalized = key.toLowerCase();
      return normalized !== "cookie" && normalized !== "set-cookie";
    }),
  );
}

function defaultFetch(url: string, options: Parameters<PluginFetch>[1]): Promise<PluginFetchResponse> {
  if (typeof globalThis.fetch !== "function") {
    return Promise.reject(new Error("fetch is not available in this runtime"));
  }
  return globalThis.fetch(url, options as Parameters<typeof globalThis.fetch>[1]) as Promise<PluginFetchResponse>;
}
