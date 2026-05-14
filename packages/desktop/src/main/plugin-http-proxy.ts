import {
  PermissionBroker,
  assertPluginHttpRequestAllowed,
  builtinPluginManifests,
  type PluginHttpPermissionBroker,
  type PluginManifest,
} from "@hexo-cms/core";
import type { PluginNetworkAuditEntryInput } from "./desktop-persistence";

const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;

export interface PluginFetchRequest {
  pluginId?: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface PluginFetchResponseBody {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface PluginHttpProxyOptions {
  appendAudit(entry: PluginNetworkAuditEntryInput): void;
  fetchImpl?: typeof fetch;
  manifests?: PluginManifest[];
  permissionBroker?: PluginHttpPermissionBroker;
  maxResponseSize?: number;
  defaultTimeoutMs?: number;
}

export function createPluginHttpProxy({
  appendAudit,
  fetchImpl = defaultFetch,
  manifests = builtinPluginManifests,
  permissionBroker = new PermissionBroker(manifests),
  maxResponseSize = DEFAULT_MAX_RESPONSE_SIZE,
  defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
}: PluginHttpProxyOptions) {
  return {
    fetch: (req: PluginFetchRequest) =>
      executePluginFetch(req, {
        appendAudit,
        fetchImpl,
        manifests,
        permissionBroker,
        maxResponseSize,
        defaultTimeoutMs,
      }),
  };
}

interface ExecutePluginFetchOptions extends Required<Omit<PluginHttpProxyOptions, "fetchImpl">> {
  fetchImpl: typeof fetch;
}

async function executePluginFetch(
  req: PluginFetchRequest,
  {
    appendAudit,
    fetchImpl,
    manifests,
    permissionBroker,
    maxResponseSize,
    defaultTimeoutMs,
  }: ExecutePluginFetchOptions,
): Promise<PluginFetchResponseBody> {
  if (!req.url || typeof req.url !== "string") {
    throw new Error("Invalid URL");
  }
  if (!req.pluginId || typeof req.pluginId !== "string") {
    throw new Error("Plugin id is required");
  }

  const manifest = manifests.find((plugin) => plugin.id === req.pluginId);
  if (!manifest) throw new Error("Unknown plugin");
  const parsedUrl = assertPluginHttpRequestAllowed(req.pluginId, manifest, permissionBroker, req.url);

  const timeoutMs = req.timeoutMs ?? defaultTimeoutMs;
  const controller = new globalThis.AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const auditPluginId = req.pluginId;
  const auditMethod = req.method ?? "GET";

  try {
    const response = await fetchImpl(parsedUrl.toString(), {
      method: auditMethod,
      headers: sanitizePluginFetchHeaders(req.headers),
      body: req.body,
      signal: controller.signal,
      credentials: "omit",
    });

    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxResponseSize) {
      appendAudit({
        pluginId: auditPluginId,
        url: parsedUrl.toString(),
        method: auditMethod,
        status: 413,
        error: "response_too_large",
      });
      throw new Error("Response too large");
    }

    const body = await response.text();
    if (body.length > maxResponseSize) {
      appendAudit({
        pluginId: auditPluginId,
        url: parsedUrl.toString(),
        method: auditMethod,
        status: 413,
        error: "response_too_large",
      });
      throw new Error("Response too large");
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key.toLowerCase()] = value;
    });

    appendAudit({
      pluginId: auditPluginId,
      url: parsedUrl.toString(),
      method: auditMethod,
      status: response.status,
    });

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message !== "Response too large") {
      appendAudit({
        pluginId: auditPluginId,
        url: parsedUrl.toString(),
        method: auditMethod,
        status: 0,
        error: message,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function sanitizePluginFetchHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const normalized = key.toLowerCase();
    if (normalized !== "cookie" && normalized !== "set-cookie") {
      result[key] = value;
    }
  }
  return result;
}

const defaultFetch: typeof fetch = (input, init) => {
  if (typeof globalThis.fetch !== "function") {
    return Promise.reject(new Error("fetch is not available in this runtime"));
  }
  return globalThis.fetch(input, init);
};
