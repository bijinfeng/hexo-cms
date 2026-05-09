import { describe, expect, it, vi } from "vitest";
import { createAnonymousSession, createDeviceFlowSession, pollGitHubDeviceFlowToken, startGitHubDeviceFlow } from "./auth";

describe("desktop GitHub OAuth", () => {
  it("creates an anonymous session when no local OAuth token exists", () => {
    expect(createAnonymousSession()).toEqual({ state: "anonymous" });
  });

  it("starts GitHub Device Flow using client_id and returns renderer-safe flow info", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        device_code: "device-secret",
        user_code: "ABCD-1234",
        verification_uri: "https://github.com/login/device",
        expires_in: 900,
        interval: 5,
      }),
    });

    const flow = await startGitHubDeviceFlow({
      clientId: "client-1",
      fetcher,
      now: () => new Date("2026-05-09T08:00:00.000Z"),
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://github.com/login/device/code",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
    expect(String(fetcher.mock.calls[0][1].body)).toContain("client_id=client-1");
    expect(flow).toEqual({
      deviceCode: "device-secret",
      session: {
        state: "authenticating",
        deviceFlow: {
          userCode: "ABCD-1234",
          verificationUri: "https://github.com/login/device",
          expiresAt: "2026-05-09T08:15:00.000Z",
          interval: 5,
        },
      },
    });
  });

  it("maps expired Device Flow polling to AUTH_TIMEOUT", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: "expired_token" }),
    });

    await expect(
      pollGitHubDeviceFlowToken({
        clientId: "client-1",
        deviceCode: "device-secret",
        fetcher,
      }),
    ).resolves.toEqual({ status: "error", error: "AUTH_TIMEOUT" });
  });

  it("keeps the last Device Flow error visible to the renderer", () => {
    expect(createDeviceFlowSession(null, "AUTH_TIMEOUT")).toEqual({
      state: "error",
      error: "AUTH_TIMEOUT",
    });
  });
});
