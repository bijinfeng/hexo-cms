import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { DesktopBackedPluginStore, WebBackedPluginStore, type SyncPluginStore } from "../plugin/platform-sync-store";

type TestValue = Record<string, { enabled: boolean }>;

function createMemoryStore(value: TestValue = {}): SyncPluginStore<TestValue> {
  let current = value;
  return {
    load: () => ({ ...current }),
    save: (next) => {
      current = { ...next };
    },
  };
}

describe("platform sync plugin store", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "electronAPI", {
      configurable: true,
      value: undefined,
    });
  });

  it("hydrates from a web endpoint once and persists updates with the configured payload key", async () => {
    const remoteValue = { plugin: { enabled: true } };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: remoteValue }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const store = new WebBackedPluginStore<TestValue>({
      endpoint: "/api/plugin/state",
      payloadKey: "state",
      fallback: createMemoryStore(),
    });

    expect(store.load()).toEqual({});
    await waitFor(() => expect(store.load()).toEqual(remoteValue));

    store.save({ plugin: { enabled: false } });

    expect(fetchMock).toHaveBeenLastCalledWith("/api/plugin/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: { plugin: { enabled: false } } }),
    });
  });

  it("hydrates from desktop IPC once and persists updates through the configured channels", async () => {
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({ plugin: { enabled: true } })
      .mockResolvedValueOnce(undefined);
    Object.defineProperty(window, "electronAPI", {
      configurable: true,
      value: { invoke },
    });

    const store = new DesktopBackedPluginStore<TestValue>({
      loadChannel: "plugin-state:load",
      saveChannel: "plugin-state:save",
      fallback: createMemoryStore(),
    });

    expect(store.load()).toEqual({});
    await waitFor(() => expect(store.load()).toEqual({ plugin: { enabled: true } }));

    store.save({ plugin: { enabled: false } });

    expect(invoke).toHaveBeenLastCalledWith("plugin-state:save", { plugin: { enabled: false } });
  });
});
