import { createFileRoute } from "@tanstack/react-router";
import { getAuth, json } from "../../../lib/server-utils";
import { appendPluginNetworkAudit } from "../../../lib/plugin-network-audit-db";

interface PluginFetchRequest {
  pluginId?: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

interface PluginFetchResponseBody {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 10_000;

function sanitizeRequestHeaders(headers: Record<string, string> | undefined): Record<string, string> {
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

export const Route = createFileRoute("/api/plugin/fetch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await getAuth(request);
        if (!session) return json({ error: "Unauthorized" }, 401);

        const req = (await request.json()) as PluginFetchRequest;

        if (!req.url || typeof req.url !== "string") {
          return json({ error: "Invalid URL" }, 400);
        }

        let parsedUrl: URL;
        try {
          parsedUrl = new URL(req.url);
        } catch {
          return json({ error: "Invalid URL" }, 400);
        }

        if (parsedUrl.protocol !== "https:") {
          return json({ error: "Only HTTPS is allowed" }, 400);
        }

        const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const controller = new globalThis.AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const auditPluginId = typeof req.pluginId === "string" ? req.pluginId : "unknown";
        const auditMethod = req.method ?? "GET";

        try {
          const response = await fetch(parsedUrl.toString(), {
            method: auditMethod,
            headers: sanitizeRequestHeaders(req.headers),
            body: req.body,
            signal: controller.signal,
            credentials: "omit",
          });

          const contentLength = response.headers.get("content-length");
          if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
            appendPluginNetworkAudit(session.user.id, {
              pluginId: auditPluginId,
              url: parsedUrl.toString(),
              method: auditMethod,
              status: 413,
              error: "response_too_large",
            });
            return json({ error: "Response too large" }, 413);
          }

          const body = await response.text();
          if (body.length > MAX_RESPONSE_SIZE) {
            appendPluginNetworkAudit(session.user.id, {
              pluginId: auditPluginId,
              url: parsedUrl.toString(),
              method: auditMethod,
              status: 413,
              error: "response_too_large",
            });
            return json({ error: "Response too large" }, 413);
          }

          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key.toLowerCase()] = value;
          });

          appendPluginNetworkAudit(session.user.id, {
            pluginId: auditPluginId,
            url: parsedUrl.toString(),
            method: auditMethod,
            status: response.status,
          });

          const result: PluginFetchResponseBody = {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
            body,
          };

          return json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          appendPluginNetworkAudit(session.user.id, {
            pluginId: auditPluginId,
            url: parsedUrl.toString(),
            method: auditMethod,
            status: 0,
            error: message,
          });
          return json({ error: message }, 500);
        } finally {
          clearTimeout(timeout);
        }
      },
    },
  },
});
