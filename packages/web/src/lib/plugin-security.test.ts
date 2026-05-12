import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  db: {
    run: vi.fn(),
    select: vi.fn(),
    delete: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("../lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("./plugin-network-audit-db", () => ({
  appendPluginNetworkAudit: vi.fn(),
}));

vi.mock("./plugin-secret-db", () => ({
  hasPluginSecret: vi.fn(),
  setPluginSecret: vi.fn(),
  deletePluginSecret: vi.fn(),
}));

const session = {
  session: {
    id: "session-1",
    userId: "user-1",
    token: "token",
    createdAt: new Date("2026-05-12T00:00:00.000Z"),
    updatedAt: new Date("2026-05-12T00:00:00.000Z"),
    expiresAt: new Date("2026-05-13T00:00:00.000Z"),
  },
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date("2026-05-12T00:00:00.000Z"),
    updatedAt: new Date("2026-05-12T00:00:00.000Z"),
  },
};

type ServerHandlers = Record<string, (input: { request: Request }) => Promise<Response>>;

function getHandlers(route: { options: { server?: { handlers?: unknown } } }): ServerHandlers {
  return route.options.server?.handlers as ServerHandlers;
}

async function getSessionMock() {
  const { auth } = await import("../lib/auth");
  return vi.mocked(auth.api.getSession);
}

describe("plugin security API routes", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
    (await getSessionMock()).mockResolvedValue(session);
  });

  it("rejects plugin fetches without a known network-enabled plugin", async () => {
    const { Route } = await import("../routes/api/plugin/fetch");
    const response = await getHandlers(Route).POST({
      request: new Request("http://localhost/api/plugin/fetch", {
        method: "POST",
        body: JSON.stringify({ pluginId: "hexo-cms-attachments-helper", url: "https://api.example.com/status" }),
      }),
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/permission|not found|Unknown/i) });
  });

  it("does not expose plaintext plugin secrets and supports scoped has/set operations", async () => {
    const secretDb = await import("./plugin-secret-db");
    vi.mocked(secretDb.hasPluginSecret).mockReturnValue(true);

    const { Route } = await import("../routes/api/plugin/secrets");
    const hasResponse = await getHandlers(Route).GET({
      request: new Request("http://localhost/api/plugin/secrets?pluginId=hexo-cms-analytics&key=apiKey"),
    });

    expect(hasResponse.status).toBe(200);
    await expect(hasResponse.json()).resolves.toEqual({ configured: true });

    const setResponse = await getHandlers(Route).PUT({
      request: new Request("http://localhost/api/plugin/secrets", {
        method: "PUT",
        body: JSON.stringify({
          op: "set",
          pluginId: "hexo-cms-analytics",
          key: "apiKey",
          value: "secret-value",
        }),
      }),
    });

    expect(setResponse.status).toBe(200);
    expect(secretDb.setPluginSecret).toHaveBeenCalledWith("user-1", "hexo-cms-analytics", "apiKey", "secret-value");
  });
});
