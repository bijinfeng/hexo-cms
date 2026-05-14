import { describe, expect, it, vi } from "vitest";
import type { PluginManifest } from "@hexo-cms/core";
import { PermissionBroker } from "@hexo-cms/core";
import { createPluginHttpProxy, sanitizePluginFetchHeaders } from "./plugin-http-proxy";
import type { PluginNetworkAuditEntryInput } from "./desktop-persistence";

const networkPlugin: PluginManifest = {
  id: "hexo-cms-network-plugin",
  name: "Network Plugin",
  version: "1.0.0",
  description: "Fetches allowed URLs",
  source: "builtin",
  permissions: ["network.fetch"],
  network: { allowedHosts: ["api.example.com"] },
};

function createJsonResponse(body: string, init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}): Response {
  return new Response(body, {
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
}

function createProxy(options: {
  fetchImpl?: typeof fetch;
  maxResponseSize?: number;
  appendAudit?: (entry: PluginNetworkAuditEntryInput) => void;
} = {}) {
  const appendAudit = options.appendAudit ?? vi.fn();
  const proxy = createPluginHttpProxy({
    appendAudit,
    fetchImpl: options.fetchImpl ?? vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse("{\"ok\":true}")),
    manifests: [networkPlugin],
    permissionBroker: new PermissionBroker([networkPlugin]),
    maxResponseSize: options.maxResponseSize,
  });

  return { proxy, appendAudit };
}

describe("desktop plugin HTTP proxy", () => {
  it("removes cookie headers before forwarding plugin fetches", () => {
    expect(sanitizePluginFetchHeaders({
      Authorization: "Bearer token",
      Cookie: "session=secret",
      "set-cookie": "next=secret",
    })).toEqual({ Authorization: "Bearer token" });
  });

  it("fetches allowed HTTPS URLs and records successful audit entries", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse("{\"ok\":true}", {
      headers: { "x-plugin": "yes" },
    }));
    const { proxy, appendAudit } = createProxy({ fetchImpl });

    await expect(proxy.fetch({
      pluginId: networkPlugin.id,
      url: "https://api.example.com/status",
      method: "POST",
      headers: { Cookie: "secret", "X-Request": "1" },
      body: "{\"ping\":true}",
    })).resolves.toEqual({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: expect.objectContaining({ "x-plugin": "yes" }),
      body: "{\"ok\":true}",
    });

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/status", expect.objectContaining({
      method: "POST",
      headers: { "X-Request": "1" },
      body: "{\"ping\":true}",
      credentials: "omit",
    }));
    expect(appendAudit).toHaveBeenCalledWith({
      pluginId: networkPlugin.id,
      url: "https://api.example.com/status",
      method: "POST",
      status: 200,
    });
  });

  it("rejects disallowed hosts before making a network request", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const { proxy, appendAudit } = createProxy({ fetchImpl });

    await expect(proxy.fetch({
      pluginId: networkPlugin.id,
      url: "https://evil.example.com/status",
    })).rejects.toThrow(/not allowed/);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(appendAudit).not.toHaveBeenCalled();
  });

  it("records response-too-large audit entries once", async () => {
    const { proxy, appendAudit } = createProxy({
      maxResponseSize: 5,
      fetchImpl: vi.fn<typeof fetch>().mockResolvedValue(createJsonResponse("too-large-body")),
    });

    await expect(proxy.fetch({
      pluginId: networkPlugin.id,
      url: "https://api.example.com/status",
    })).rejects.toThrow("Response too large");

    expect(appendAudit).toHaveBeenCalledTimes(1);
    expect(appendAudit).toHaveBeenCalledWith({
      pluginId: networkPlugin.id,
      url: "https://api.example.com/status",
      method: "GET",
      status: 413,
      error: "response_too_large",
    });
  });

  it("records fetch failures for allowed requests", async () => {
    const { proxy, appendAudit } = createProxy({
      fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new Error("network down")),
    });

    await expect(proxy.fetch({
      pluginId: networkPlugin.id,
      url: "https://api.example.com/status",
    })).rejects.toThrow("network down");

    expect(appendAudit).toHaveBeenCalledWith({
      pluginId: networkPlugin.id,
      url: "https://api.example.com/status",
      method: "GET",
      status: 0,
      error: "network down",
    });
  });
});
