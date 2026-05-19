# Plugin Architecture Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current built-in plugin path with one unified plugin platform where official and local-dev plugins use the same definition, catalog, host, permission, registry, and UI outlet flow.

**Architecture:** `@hexo-cms/core` owns plugin contracts, catalog, host, validation, permissions, and runtime registration. Official plugin business code moves to independent workspace plugin packages under `packages/plugins/*`, with an aggregator package at `packages/plugins`. Web and Desktop create platform-specific plugin hosts and pass them into `@hexo-cms/ui`.

**Tech Stack:** TypeScript, React 19, pnpm workspace, Vitest, Testing Library, existing PluginManager/registry APIs.

---

## File Structure

### Core Platform

- Modify: `packages/core/src/plugin/types.ts`
  - Replace `PluginSource` with `PluginOrigin`.
  - Add `PluginRuntime`, `PluginDefinition`, `PluginRuntimeContext`, runtime contribution factory types, and UI flag contributions.
  - Add `origin` and `runtime` to `PluginManifest`; remove `source`.
- Modify: `packages/core/src/plugin/manifest.ts`
  - Validate `origin`, `runtime`, permissions, network policy, and contribution shapes.
  - Reject `source` to enforce the clean break.
- Create: `packages/core/src/plugin/define-plugin.ts`
  - Typed helper for plugin packages.
- Create: `packages/core/src/plugin/source-resolver.ts`
  - Source resolver interface and static resolver implementation for official/local-dev plugin definitions.
- Create: `packages/core/src/plugin/plugin-catalog.ts`
  - Validates definitions, rejects duplicate ids, exposes manifests/definitions/default enabled ids.
- Create: `packages/core/src/plugin/plugin-host.ts`
  - Owns PluginManager construction, renderer registry, runtime handler registration, and host-facing methods.
- Modify: `packages/core/src/plugin/plugin-manager.ts`
  - Use `origin` in records.
  - Add runtime cleanup helpers needed by PluginHost.
  - Expose config lookup used by runtime contexts.
- Modify: `packages/core/src/plugin/extension-registry.ts`
  - Add `uiFlags` extension snapshot.
- Modify: `packages/core/src/plugin/command-registry.ts`
  - Add handler unregister support.
- Modify: `packages/core/src/plugin/diagnostics-registry.ts`
  - Ensure diagnostics handlers can be unregistered by plugin id.
- Modify: `packages/core/src/plugin/index.ts`
  - Export new platform files.
  - Remove `./builtin` export.
- Delete: `packages/core/src/plugin/builtin.ts`
- Modify/Test: `packages/core/src/__tests__/plugin.test.ts`
- Create/Test: `packages/core/src/__tests__/plugin-platform.test.ts`
- Create/Test: `packages/core/src/__tests__/plugin-host.test.ts`

### Plugin Packages

- Modify: `pnpm-workspace.yaml`
  - Add `packages/plugins/*`.
- Create: `packages/plugins/package.json`
- Create: `packages/plugins/src/index.ts`
- Create: `packages/plugins/src/official.ts`
- Create: `packages/plugins/src/local-dev.ts`
- Create: `packages/plugins/src/__tests__/official-plugins.test.tsx`
- Create package: `packages/plugins/attachments-helper`
- Create package: `packages/plugins/comments-overview`
- Create package: `packages/plugins/seo-inspector`
- Create package: `packages/plugins/draft-coach`

### UI Host

- Modify: `packages/ui/src/plugin/plugin-provider.tsx`
  - Accept a `PluginHost`.
  - Remove official manifest, command, diagnostics, and default-enabled wiring.
- Modify: `packages/ui/src/plugin/extension-outlet.tsx`
  - Resolve renderers through host-provided resolver.
  - Remove built-in renderer map.
- Modify: `packages/ui/src/plugin/plugin-settings.tsx`
  - Show `origin` and `runtime`.
  - Update policy text from "built-in plugins" to host policy.
- Modify: `packages/ui/src/plugin/index.ts`
- Modify: `packages/ui/src/app-shell.ts`
- Modify: `packages/ui/src/pages/index.tsx`
- Modify: `packages/ui/src/pages/media.tsx`
- Modify: `packages/ui/src/components/layout/CMSLayout.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/package.json`
  - Remove `./pages/comments` export after CommentsPage moves.
- Delete after move: `packages/ui/src/pages/comments.tsx`
- Delete after move: `packages/ui/src/plugin/renderers/attachments-summary-widget.tsx`
- Delete after move: `packages/ui/src/plugin/renderers/comments-overview-widget.tsx`
- Delete after move: `packages/ui/src/plugin/diagnostics/seo-inspector.ts`
- Delete after move: `packages/ui/src/plugin/draft-coach/*`
- Modify/Test: `packages/ui/src/__tests__/plugin-ui.test.tsx`

### Web And Desktop

- Modify: `packages/web/package.json`
  - Add `@hexo-cms/plugins`.
- Create: `packages/web/src/lib/plugin-host.ts`
- Modify: `packages/web/src/routes/__root.tsx`
- Modify: `packages/web/src/routes/comments.tsx`
- Modify: `packages/web/src/routes/api/plugin/fetch.ts`
- Modify/Test: `packages/web/src/lib/plugin-security.test.ts`

- Modify: `packages/desktop/package.json`
  - Add `@hexo-cms/plugins`.
- Create: `packages/desktop/src/renderer/src/lib/plugin-host.ts`
- Modify: `packages/desktop/src/renderer/src/routes/__root.tsx`
- Modify: `packages/desktop/src/renderer/src/routes/comments.tsx`
- Modify: `packages/desktop/src/main/index.ts`
- Modify: `packages/desktop/src/main/plugin-http-proxy.ts`
- Modify/Test: `packages/desktop/src/main/plugin-http-proxy.test.ts`

---

### Task 1: Core Plugin Definition, Origin, Runtime, Catalog

**Files:**
- Modify: `packages/core/src/plugin/types.ts`
- Modify: `packages/core/src/plugin/manifest.ts`
- Create: `packages/core/src/plugin/define-plugin.ts`
- Create: `packages/core/src/plugin/source-resolver.ts`
- Create: `packages/core/src/plugin/plugin-catalog.ts`
- Create: `packages/core/src/plugin/plugin-host.ts`
- Modify: `packages/core/src/plugin/index.ts`
- Test: `packages/core/src/__tests__/plugin-platform.test.ts`

- [ ] **Step 1: Write failing tests for the new manifest and catalog contract**

Create `packages/core/src/__tests__/plugin-platform.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  PluginCatalog,
  PluginManifestError,
  StaticPluginSourceResolver,
  definePlugin,
  validatePluginManifest,
} from "../plugin";

const validManifest = {
  id: "hexo-cms-test-plugin",
  name: "Test Plugin",
  version: "1.0.0",
  description: "Test plugin",
  origin: "official",
  runtime: "hosted",
  permissions: ["ui.contribute"],
  contributes: {
    dashboardWidgets: [
      {
        id: "test.widget",
        title: "Test Widget",
        renderer: "test.widget",
        size: "medium",
      },
    ],
  },
} as const;

describe("plugin platform contract", () => {
  it("validates origin and runtime instead of source", () => {
    expect(validatePluginManifest(validManifest)).toEqual(expect.objectContaining({
      id: "hexo-cms-test-plugin",
      origin: "official",
      runtime: "hosted",
    }));

    expect(() =>
      validatePluginManifest({
        ...validManifest,
        origin: "builtin",
      }),
    ).toThrow(PluginManifestError);

    expect(() =>
      validatePluginManifest({
        ...validManifest,
        source: "builtin",
      }),
    ).toThrow(PluginManifestError);
  });

  it("creates a catalog from source resolvers and rejects duplicate ids", async () => {
    const plugin = definePlugin({
      manifest: validManifest,
      renderers: {
        "test.widget": () => null,
      },
    });

    const catalog = await PluginCatalog.discover([
      new StaticPluginSourceResolver("official", [plugin]),
    ]);

    expect(catalog.manifests()).toEqual([expect.objectContaining({ id: validManifest.id })]);
    expect(catalog.getDefinition(validManifest.id)).toBe(plugin);
    expect(catalog.getManifest(validManifest.id)).toEqual(expect.objectContaining({
      origin: "official",
      runtime: "hosted",
    }));

    await expect(
      PluginCatalog.discover([
        new StaticPluginSourceResolver("official", [plugin, plugin]),
      ]),
    ).rejects.toThrow(/duplicate plugin id/i);
  });

  it("only includes enabled local-dev definitions when the source is enabled", async () => {
    const plugin = definePlugin({
      manifest: {
        ...validManifest,
        id: "hexo-cms-local-plugin",
        origin: "local-dev",
      },
    });

    const disabledCatalog = await PluginCatalog.discover([
      new StaticPluginSourceResolver("local-dev", [plugin], { enabled: false }),
    ]);

    expect(disabledCatalog.manifests()).toEqual([]);

    const enabledCatalog = await PluginCatalog.discover([
      new StaticPluginSourceResolver("local-dev", [plugin], { enabled: true }),
    ]);

    expect(enabledCatalog.manifests().map((manifest) => manifest.id)).toEqual([
      "hexo-cms-local-plugin",
    ]);
  });
});
```

- [ ] **Step 2: Run the failing core platform tests**

Run:

```bash
pnpm --filter @hexo-cms/core test -- plugin-platform.test.ts
```

Expected: FAIL because `PluginCatalog`, `StaticPluginSourceResolver`, `definePlugin`, `origin`, and `runtime` do not exist.

- [ ] **Step 3: Update core plugin types**

Modify `packages/core/src/plugin/types.ts`:

```ts
export type PluginOrigin = "official" | "local-dev" | "private" | "marketplace";

export type PluginRuntime = "hosted" | "worker" | "iframe";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  origin: PluginOrigin;
  runtime: PluginRuntime;
  engine?: {
    hexoCms?: string;
  };
  activation?: PluginActivationEvent[];
  permissions: PluginPermission[];
  network?: {
    allowedHosts: string[];
  };
  contributes?: PluginContributions;
}

export interface UiFlagContribution {
  id: string;
  flag: "media.documentFilter" | "media.search";
  title: string;
  order?: number;
}

export interface PluginContributions {
  dashboardWidgets?: DashboardWidgetContribution[];
  settingsPanels?: SettingsPanelContribution[];
  settingsSchemas?: Record<string, PluginSettingsSchema>;
  sidebarItems?: SidebarItemContribution[];
  commands?: CommandContribution[];
  diagnostics?: DiagnosticsContribution[];
  events?: EventContribution[];
  uiFlags?: UiFlagContribution[];
}

export interface RegisteredUiFlag extends UiFlagContribution {
  pluginId: string;
  pluginName: string;
}

export interface PluginExtensionRegistrySnapshot {
  dashboardWidgets: RegisteredDashboardWidget[];
  settingsPanels: RegisteredSettingsPanel[];
  sidebarItems: RegisteredSidebarItem[];
  commands: RegisteredCommand[];
  diagnostics: RegisteredDiagnostics[];
  uiFlags: RegisteredUiFlag[];
}

export interface PluginRecord {
  id: string;
  version: string;
  origin: PluginOrigin;
  state: PluginState;
  enabledAt?: string;
  lastError?: PluginErrorSummary;
}

export interface PluginRuntimeContext {
  readonly plugin: PluginManifest;
  readonly content: ContentReadAPI;
  readonly storage: PluginStorageAPI;
  readonly secrets: PluginSecretAPI;
  readonly events: PluginEventAPI;
  readonly http: PluginHttpAPI;
  readonly logger: PluginLogger;
  getConfig(): PluginConfigValue;
}

export type PluginRuntimeFactory<T> = (context: PluginRuntimeContext) => T;

export interface PluginDefinition<TRenderer = unknown> {
  manifest: PluginManifest;
  defaultEnabled?: boolean;
  renderers?: Record<string, TRenderer>;
  commands?: Record<string, PluginRuntimeFactory<PluginCommandHandler>>;
  diagnostics?: Record<string, PluginRuntimeFactory<DiagnosticsHandler>>;
  events?: Record<string, PluginRuntimeFactory<PluginEventHandler>>;
}
```

Remove the old `PluginSource` export and every `source` field from plugin types.

- [ ] **Step 4: Add `definePlugin`**

Create `packages/core/src/plugin/define-plugin.ts`:

```ts
import type { PluginDefinition } from "./types";

export function definePlugin<TRenderer = unknown>(
  definition: PluginDefinition<TRenderer>,
): PluginDefinition<TRenderer> {
  return definition;
}
```

- [ ] **Step 5: Add static source resolver**

Create `packages/core/src/plugin/source-resolver.ts`:

```ts
import type { PluginDefinition, PluginOrigin } from "./types";

export interface PluginSourceResolver<TRenderer = unknown> {
  readonly origin: PluginOrigin;
  discover(): Promise<Array<PluginDefinition<TRenderer>>>;
}

export interface StaticPluginSourceResolverOptions {
  enabled?: boolean;
}

export class StaticPluginSourceResolver<TRenderer = unknown> implements PluginSourceResolver<TRenderer> {
  readonly origin: PluginOrigin;
  private readonly enabled: boolean;

  constructor(
    origin: PluginOrigin,
    private readonly definitions: Array<PluginDefinition<TRenderer>>,
    options: StaticPluginSourceResolverOptions = {},
  ) {
    this.origin = origin;
    this.enabled = options.enabled ?? true;
  }

  async discover(): Promise<Array<PluginDefinition<TRenderer>>> {
    if (!this.enabled) return [];
    return this.definitions.map((definition) => ({
      ...definition,
      manifest: {
        ...definition.manifest,
        origin: this.origin,
      },
    }));
  }
}
```

- [ ] **Step 6: Update manifest validation**

Modify `packages/core/src/plugin/manifest.ts`:

```ts
import { PluginManifestError } from "./errors";
import type { PluginManifest, PluginOrigin, PluginPermission, PluginRuntime } from "./types";

const PLUGIN_ID_PATTERN = /^[a-z0-9][a-z0-9-_.]+$/;
const VALID_ORIGINS = new Set<PluginOrigin>(["official", "local-dev", "private", "marketplace"]);
const VALID_RUNTIMES = new Set<PluginRuntime>(["hosted", "worker", "iframe"]);
const VALID_PERMISSIONS = new Set<PluginPermission>([
  "content.read",
  "config.read",
  "pluginStorage.read",
  "pluginStorage.write",
  "pluginSecret.read",
  "pluginSecret.write",
  "pluginConfig.write",
  "ui.contribute",
  "command.register",
  "event.subscribe",
  "network.fetch",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new PluginManifestError(`${field} is required`);
  }
}

export function validatePluginManifest(value: unknown): PluginManifest {
  if (!isRecord(value)) throw new PluginManifestError("manifest must be an object");
  if ("source" in value) throw new PluginManifestError("source is not supported; use origin");

  assertString(value.id, "id");
  if (!PLUGIN_ID_PATTERN.test(value.id)) {
    throw new PluginManifestError("id must match /^[a-z0-9][a-z0-9-_.]+$/");
  }

  assertString(value.name, "name");
  assertString(value.version, "version");
  assertString(value.description, "description");
  assertString(value.origin, "origin");
  assertString(value.runtime, "runtime");

  if (!VALID_ORIGINS.has(value.origin as PluginOrigin)) {
    throw new PluginManifestError("origin must be official, local-dev, private, or marketplace");
  }
  if (!VALID_RUNTIMES.has(value.runtime as PluginRuntime)) {
    throw new PluginManifestError("runtime must be hosted, worker, or iframe");
  }

  if (!Array.isArray(value.permissions)) {
    throw new PluginManifestError("permissions must be an array");
  }

  for (const permission of value.permissions) {
    if (typeof permission !== "string" || !VALID_PERMISSIONS.has(permission as PluginPermission)) {
      throw new PluginManifestError(`unknown permission: ${String(permission)}`);
    }
  }

  const manifest = value as unknown as PluginManifest;
  if (manifest.permissions.includes("network.fetch") && !manifest.network?.allowedHosts?.length) {
    throw new PluginManifestError("network.allowedHosts is required when network.fetch is declared");
  }

  return {
    ...manifest,
    permissions: [...new Set(manifest.permissions)],
  };
}

export function validatePluginManifests(values: unknown[]): PluginManifest[] {
  const seen = new Set<string>();
  return values.map((value) => {
    const manifest = validatePluginManifest(value);
    if (seen.has(manifest.id)) {
      throw new PluginManifestError(`duplicate plugin id: ${manifest.id}`);
    }
    seen.add(manifest.id);
    return manifest;
  });
}
```

- [ ] **Step 7: Add `PluginCatalog`**

Create `packages/core/src/plugin/plugin-catalog.ts`:

```ts
import { PluginManifestError } from "./errors";
import { validatePluginManifest } from "./manifest";
import type { PluginDefinition, PluginManifest } from "./types";
import type { PluginSourceResolver } from "./source-resolver";

export class PluginCatalog<TRenderer = unknown> {
  private readonly definitionsById = new Map<string, PluginDefinition<TRenderer>>();
  private readonly manifestsById = new Map<string, PluginManifest>();

  static async discover<TRenderer = unknown>(
    sources: Array<PluginSourceResolver<TRenderer>>,
  ): Promise<PluginCatalog<TRenderer>> {
    const definitions: Array<PluginDefinition<TRenderer>> = [];
    for (const source of sources) {
      definitions.push(...(await source.discover()));
    }
    return new PluginCatalog(definitions);
  }

  constructor(definitions: Array<PluginDefinition<TRenderer>>) {
    for (const definition of definitions) {
      const manifest = validatePluginManifest(definition.manifest);
      if (manifest.runtime !== "hosted") {
        throw new PluginManifestError(`unsupported runtime for first implementation: ${manifest.runtime}`);
      }
      if (this.definitionsById.has(manifest.id)) {
        throw new PluginManifestError(`duplicate plugin id: ${manifest.id}`);
      }
      const normalized = { ...definition, manifest };
      this.definitionsById.set(manifest.id, normalized);
      this.manifestsById.set(manifest.id, manifest);
    }
  }

  definitions(): Array<PluginDefinition<TRenderer>> {
    return [...this.definitionsById.values()];
  }

  manifests(): PluginManifest[] {
    return [...this.manifestsById.values()];
  }

  getDefinition(pluginId: string): PluginDefinition<TRenderer> | undefined {
    return this.definitionsById.get(pluginId);
  }

  getManifest(pluginId: string): PluginManifest | undefined {
    return this.manifestsById.get(pluginId);
  }

  defaultEnabledPluginIds(): string[] {
    return this.definitions()
      .filter((definition) => definition.defaultEnabled)
      .map((definition) => definition.manifest.id);
  }
}
```

- [ ] **Step 8: Export new core files**

Modify `packages/core/src/plugin/index.ts`:

```ts
export * from "./audit-log";
export * from "./command-registry";
export * from "./define-plugin";
export * from "./diagnostics-registry";
export * from "./errors";
export * from "./event-bus";
export * from "./extension-registry";
export * from "./manifest";
export * from "./permissions";
export * from "./plugin-catalog";
export * from "./plugin-host";
export * from "./plugin-logger";
export * from "./plugin-manager";
export * from "./plugin-http";
export * from "./plugin-secret";
export * from "./plugin-storage";
export * from "./source-resolver";
export * from "./stores";
export * from "./types";
```

Create `packages/core/src/plugin/plugin-host.ts` as a temporary empty module so the Task 1 commit remains self-contained. Task 2 replaces this file with the real implementation:

```ts
export {};
```

- [ ] **Step 9: Run core platform tests**

Run:

```bash
pnpm --filter @hexo-cms/core test -- plugin-platform.test.ts
```

Expected: PASS.

- [ ] **Step 10: Commit Task 1**

```bash
git add packages/core/src/plugin packages/core/src/__tests__/plugin-platform.test.ts
git commit -m "feat: add unified plugin catalog contract"
```

---

### Task 2: Core PluginHost And Runtime Contribution Binding

**Files:**
- Create/Modify: `packages/core/src/plugin/plugin-host.ts`
- Modify: `packages/core/src/plugin/plugin-manager.ts`
- Modify: `packages/core/src/plugin/command-registry.ts`
- Modify: `packages/core/src/plugin/diagnostics-registry.ts`
- Modify: `packages/core/src/plugin/extension-registry.ts`
- Test: `packages/core/src/__tests__/plugin-host.test.ts`

- [ ] **Step 1: Write failing PluginHost tests**

Create `packages/core/src/__tests__/plugin-host.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import {
  MemoryPluginConfigStore,
  MemoryPluginLogStore,
  MemoryPluginSecretStore,
  MemoryPluginStateStore,
  MemoryPluginStorageStore,
  PluginCatalog,
  PluginHost,
  definePlugin,
  type DataProvider,
} from "../index";

function createDataProvider(): DataProvider {
  return {
    getConfig: vi.fn().mockResolvedValue(null),
    saveConfig: vi.fn().mockResolvedValue(undefined),
    getToken: vi.fn().mockResolvedValue(null),
    saveToken: vi.fn().mockResolvedValue(undefined),
    deleteToken: vi.fn().mockResolvedValue(undefined),
    getPosts: vi.fn().mockResolvedValue([]),
    getPost: vi.fn().mockResolvedValue(null),
    savePost: vi.fn().mockResolvedValue(undefined),
    deletePost: vi.fn().mockResolvedValue(undefined),
    getPages: vi.fn().mockResolvedValue([]),
    getPage: vi.fn().mockResolvedValue(null),
    savePage: vi.fn().mockResolvedValue(undefined),
    deletePage: vi.fn().mockResolvedValue(undefined),
    getTags: vi.fn().mockResolvedValue({ tags: [], categories: [], total: 0 }),
    renameTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    deleteTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    mergeTag: vi.fn().mockResolvedValue({ updatedCount: 0 }),
    getMediaFiles: vi.fn().mockResolvedValue([]),
    uploadMedia: vi.fn().mockResolvedValue({ url: "" }),
    deleteMedia: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({ totalPosts: 0, publishedPosts: 0, draftPosts: 0, totalViews: 0 }),
    getThemes: vi.fn().mockResolvedValue({ currentTheme: "", installedThemes: [] }),
    switchTheme: vi.fn().mockResolvedValue(undefined),
    getDeployments: vi.fn().mockResolvedValue([]),
    triggerDeploy: vi.fn().mockResolvedValue(undefined),
    readConfigFile: vi.fn().mockResolvedValue(""),
    writeConfigFile: vi.fn().mockResolvedValue(undefined),
  };
}

function createHost() {
  const renderer = vi.fn();
  const commandHandler = vi.fn().mockReturnValue("ok");
  const diagnosticsHandler = vi.fn().mockResolvedValue([]);
  const eventHandler = vi.fn();
  const plugin = definePlugin({
    defaultEnabled: true,
    manifest: {
      id: "hexo-cms-host-test",
      name: "Host Test",
      version: "1.0.0",
      description: "Host test plugin",
      origin: "official",
      runtime: "hosted",
      permissions: ["ui.contribute", "command.register", "content.read", "event.subscribe"],
      contributes: {
        dashboardWidgets: [
          {
            id: "host.widget",
            title: "Host Widget",
            renderer: "host.widget",
            size: "medium",
          },
        ],
        commands: [{ id: "host.run", title: "Run" }],
        diagnostics: [{ id: "host.diagnostics", title: "Diagnostics", scope: "site" }],
        events: [{ name: "post.afterSave" }],
        uiFlags: [{ id: "media-documents", flag: "media.documentFilter", title: "Media documents" }],
      },
    },
    renderers: {
      "host.widget": renderer,
    },
    commands: {
      "host.run": () => commandHandler,
    },
    diagnostics: {
      "host.diagnostics": () => diagnosticsHandler,
    },
    events: {
      "post.afterSave": () => eventHandler,
    },
  });

  const host = new PluginHost({
    catalog: new PluginCatalog([plugin]),
    stateStore: new MemoryPluginStateStore(),
    configStore: new MemoryPluginConfigStore(),
    storageStore: new MemoryPluginStorageStore(),
    secretStore: new MemoryPluginSecretStore(),
    logStore: new MemoryPluginLogStore(),
    dataProvider: createDataProvider(),
  });

  return { host, renderer, commandHandler, diagnosticsHandler, eventHandler };
}

describe("PluginHost", () => {
  it("activates default enabled plugin runtime contributions", async () => {
    const { host, renderer, commandHandler, diagnosticsHandler, eventHandler } = createHost();

    const snapshot = host.snapshot();
    expect(snapshot.plugins[0].record.state).toBe("enabled");
    expect(snapshot.extensions.dashboardWidgets[0]).toEqual(expect.objectContaining({
      renderer: "host.widget",
      pluginId: "hexo-cms-host-test",
    }));
    expect(snapshot.extensions.uiFlags[0]).toEqual(expect.objectContaining({
      flag: "media.documentFilter",
    }));
    expect(host.getDashboardWidgetRenderer(snapshot.extensions.dashboardWidgets[0])).toBe(renderer);

    await expect(host.executePluginCommand("hexo-cms-host-test", "host.run")).resolves.toEqual(
      expect.objectContaining({ ok: true, value: "ok" }),
    );
    expect(commandHandler).toHaveBeenCalled();

    await host.runDiagnostics({ scope: "site" });
    expect(diagnosticsHandler).toHaveBeenCalled();

    await host.emitEvent("post.afterSave", { post: { path: "source/_posts/a.md" } });
    expect(eventHandler).toHaveBeenCalled();
  });

  it("removes runtime contributions when a plugin is disabled", async () => {
    const { host, eventHandler } = createHost();

    host.disablePlugin("hexo-cms-host-test");
    expect(host.snapshot().extensions.dashboardWidgets).toEqual([]);
    expect(host.snapshot().extensions.uiFlags).toEqual([]);

    await expect(host.executePluginCommand("hexo-cms-host-test", "host.run")).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "PLUGIN_COMMAND_NOT_FOUND" }),
      }),
    );

    await host.emitEvent("post.afterSave", {});
    expect(eventHandler).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the failing host tests**

Run:

```bash
pnpm --filter @hexo-cms/core test -- plugin-host.test.ts
```

Expected: FAIL because `PluginHost`, `uiFlags`, and runtime cleanup helpers do not exist.

- [ ] **Step 3: Register `uiFlags` in ExtensionRegistry**

Modify `packages/core/src/plugin/extension-registry.ts`:

```ts
import type {
  PluginExtensionRegistrySnapshot,
  PluginManifest,
  RegisteredCommand,
  RegisteredDashboardWidget,
  RegisteredDiagnostics,
  RegisteredSettingsPanel,
  RegisteredSidebarItem,
  RegisteredUiFlag,
} from "./types";
```

Add field:

```ts
private readonly uiFlags = new Map<string, RegisteredUiFlag>();
```

In `registerPlugin` add:

```ts
contributes.uiFlags?.forEach((flag) => {
  this.uiFlags.set(`${manifest.id}:${flag.id}`, {
    ...flag,
    pluginId: manifest.id,
    pluginName: manifest.name,
  });
});
```

In `unregisterPlugin` add:

```ts
for (const key of this.uiFlags.keys()) {
  if (key.startsWith(`${pluginId}:`)) this.uiFlags.delete(key);
}
```

In `snapshot()` return:

```ts
uiFlags: [...this.uiFlags.values()].sort(byOrderThenTitle),
```

- [ ] **Step 4: Add runtime cleanup helpers**

Modify `packages/core/src/plugin/command-registry.ts`:

```ts
unregisterPlugin(pluginId: string): void {
  for (const key of this.commands.keys()) {
    if (key.startsWith(`${pluginId}:`)) this.commands.delete(key);
  }
}

unregisterHandlers(pluginId: string): void {
  for (const key of this.handlers.keys()) {
    if (key.startsWith(`${pluginId}:`)) this.handlers.delete(key);
  }
}
```

Modify `packages/core/src/plugin/plugin-manager.ts`:

```ts
getPluginConfig(pluginId: string): PluginConfigValue {
  this.getManifest(pluginId);
  return this.configs[pluginId] ?? {};
}

unregisterPluginRuntime(pluginId: string): void {
  this.getManifest(pluginId);
  this.commandRegistry.unregisterHandlers(pluginId);
  this.diagnosticsRegistry.unregisterPlugin(pluginId);
  this.eventBus.unregisterPlugin(pluginId);
}
```

In `rebuildExtensions`, keep command contribution registration through manifests. Runtime command handlers are registered by `PluginHost`.

- [ ] **Step 5: Implement `PluginHost`**

Replace `packages/core/src/plugin/plugin-host.ts` with:

```ts
import { PluginCatalog } from "./plugin-catalog";
import { PluginManager, type PluginConfigStore, type PluginStateStore } from "./plugin-manager";
import type { PluginFetch } from "./plugin-http";
import type { PluginLogStore } from "./plugin-logger";
import type { PluginSecretStore } from "./plugin-secret";
import type { PluginStorageStore } from "./plugin-storage";
import type {
  DiagnosticsReport,
  DiagnosticsTarget,
  PluginCommandExecutionResult,
  PluginConfigValue,
  PluginDefinition,
  PluginEventDispatchResult,
  PluginEventName,
  PluginManagerSnapshot,
  PluginRuntimeContext,
  PluginRuntimeErrorInput,
  RegisteredDashboardWidget,
} from "./types";
import type { DataProvider } from "../data-provider";

export interface PluginHostOptions<TRenderer = unknown> {
  catalog: PluginCatalog<TRenderer>;
  stateStore: PluginStateStore;
  configStore: PluginConfigStore;
  storageStore: PluginStorageStore;
  secretStore: PluginSecretStore;
  logStore: PluginLogStore;
  fetchImpl?: PluginFetch;
  dataProvider: DataProvider;
}

export class PluginHost<TRenderer = unknown> {
  private readonly manager: PluginManager;
  private readonly renderers = new Map<string, TRenderer>();
  private readonly activeRuntimePlugins = new Set<string>();

  constructor(private readonly options: PluginHostOptions<TRenderer>) {
    this.manager = new PluginManager({
      manifests: options.catalog.manifests(),
      store: options.stateStore,
      configStore: options.configStore,
      storageStore: options.storageStore,
      secretStore: options.secretStore,
      logStore: options.logStore,
      fetchImpl: options.fetchImpl,
      dataProvider: options.dataProvider,
      defaultEnabledPluginIds: options.catalog.defaultEnabledPluginIds(),
    });
    this.syncRuntimeContributions();
  }

  snapshot(): PluginManagerSnapshot {
    return this.manager.snapshot();
  }

  manifests() {
    return this.options.catalog.manifests();
  }

  getManifest(pluginId: string) {
    return this.options.catalog.getManifest(pluginId);
  }

  enablePlugin(pluginId: string): PluginManagerSnapshot {
    this.manager.enable(pluginId);
    this.syncRuntimeContributions();
    return this.snapshot();
  }

  disablePlugin(pluginId: string): PluginManagerSnapshot {
    this.manager.disable(pluginId);
    this.syncRuntimeContributions();
    return this.snapshot();
  }

  updatePluginConfig(pluginId: string, config: PluginConfigValue): PluginManagerSnapshot {
    return this.manager.updatePluginConfig(pluginId, config);
  }

  recordPluginError(pluginId: string, error: PluginRuntimeErrorInput): PluginManagerSnapshot {
    const snapshot = this.manager.recordPluginError(pluginId, error);
    this.syncRuntimeContributions();
    return snapshot;
  }

  executePluginCommand(
    pluginId: string,
    commandId: string,
    args: unknown[] = [],
  ): Promise<PluginCommandExecutionResult> {
    return this.manager.executeCommand(pluginId, commandId, args);
  }

  runDiagnostics(target: DiagnosticsTarget): Promise<DiagnosticsReport[]> {
    return this.manager.runDiagnostics(target);
  }

  emitEvent<TPayload = unknown>(
    eventName: PluginEventName,
    payload: TPayload,
  ): Promise<PluginEventDispatchResult[]> {
    return this.manager.emitEvent(eventName, payload);
  }

  getDashboardWidgetRenderer(widget: RegisteredDashboardWidget): TRenderer | undefined {
    return this.renderers.get(`${widget.pluginId}:${widget.renderer}`);
  }

  private syncRuntimeContributions(): void {
    const enabled = new Set(
      this.snapshot().plugins
        .filter(({ record }) => record.state === "enabled")
        .map(({ manifest }) => manifest.id),
    );

    for (const pluginId of [...this.activeRuntimePlugins]) {
      if (!enabled.has(pluginId)) {
        this.unregisterRuntime(pluginId);
      }
    }

    for (const pluginId of enabled) {
      if (!this.activeRuntimePlugins.has(pluginId)) {
        this.registerRuntime(pluginId);
      }
    }
  }

  private registerRuntime(pluginId: string): void {
    const definition = this.options.catalog.getDefinition(pluginId);
    if (!definition) return;

    for (const [rendererId, renderer] of Object.entries(definition.renderers ?? {})) {
      this.renderers.set(`${pluginId}:${rendererId}`, renderer);
    }

    const context = this.createRuntimeContext(definition);

    for (const [commandId, factory] of Object.entries(definition.commands ?? {})) {
      this.manager.registerCommandHandler(pluginId, commandId, factory(context));
    }
    for (const [diagnosticsId, factory] of Object.entries(definition.diagnostics ?? {})) {
      this.manager.registerDiagnosticsHandler(pluginId, diagnosticsId, factory(context));
    }
    for (const [eventName, factory] of Object.entries(definition.events ?? {})) {
      context.events.on(eventName, factory(context));
    }

    this.activeRuntimePlugins.add(pluginId);
  }

  private unregisterRuntime(pluginId: string): void {
    for (const key of this.renderers.keys()) {
      if (key.startsWith(`${pluginId}:`)) this.renderers.delete(key);
    }
    this.manager.unregisterPluginRuntime(pluginId);
    this.activeRuntimePlugins.delete(pluginId);
  }

  private createRuntimeContext(definition: PluginDefinition<TRenderer>): PluginRuntimeContext {
    const pluginId = definition.manifest.id;
    return {
      plugin: definition.manifest,
      content: this.manager.createContentAPI(pluginId),
      storage: this.manager.createStorageAPI(pluginId),
      secrets: this.manager.createSecretAPI(pluginId),
      events: this.manager.createEventAPI(pluginId),
      http: this.manager.createHttpAPI(pluginId),
      logger: this.manager.createLogger(pluginId),
      getConfig: () => this.manager.getPluginConfig(pluginId),
    };
  }
}
```

If `createContentAPI` is currently private in `PluginManager`, change it to public:

```ts
createContentAPI(pluginId: string): ContentReadAPI {
  if (!this.dataProvider) {
    throw new Error("PluginManager requires a dataProvider to create content API");
  }
  return createContentReadAPI(pluginId, this.dataProvider, this.permissionBroker);
}
```

- [ ] **Step 6: Run host tests**

Run:

```bash
pnpm --filter @hexo-cms/core test -- plugin-host.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run existing core plugin tests and update source/origin fixtures**

Run:

```bash
pnpm --filter @hexo-cms/core test -- plugin.test.ts
```

Expected: FAIL until all inline test manifests use:

```ts
origin: "official",
runtime: "hosted",
```

Update every inline manifest in `packages/core/src/__tests__/plugin.test.ts` from:

```ts
source: "builtin",
```

to:

```ts
origin: "official",
runtime: "hosted",
```

Remove tests that assert `builtinPluginManifests` behavior; official plugin package tests cover those after Task 3.

- [ ] **Step 8: Run core tests for Task 2**

Run:

```bash
pnpm --filter @hexo-cms/core test -- plugin-platform.test.ts plugin-host.test.ts plugin.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit Task 2**

```bash
git add packages/core/src/plugin packages/core/src/__tests__
git commit -m "feat: add plugin host runtime binding"
```

---

### Task 3: Create Official Plugin Packages

**Files:**
- Modify: `pnpm-workspace.yaml`
- Create: `packages/plugins/package.json`
- Create: `packages/plugins/vitest.config.ts`
- Create: `packages/plugins/src/index.ts`
- Create: `packages/plugins/src/official.ts`
- Create: `packages/plugins/src/local-dev.ts`
- Create: `packages/plugins/src/__tests__/official-plugins.test.tsx`
- Create packages under `packages/plugins/attachments-helper`, `comments-overview`, `seo-inspector`, `draft-coach`
- Move official implementation files from `packages/ui/src/plugin` and `packages/ui/src/pages/comments.tsx`

- [ ] **Step 1: Add nested plugin workspaces**

Modify `pnpm-workspace.yaml`:

```yaml
packages:
  - 'packages/*'
  - 'packages/plugins/*'
```

- [ ] **Step 2: Create the official plugin aggregator package**

Create `packages/plugins/package.json`:

```json
{
  "name": "@hexo-cms/plugins",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./official": "./src/official.ts",
    "./local-dev": "./src/local-dev.ts"
  },
  "dependencies": {
    "@hexo-cms/core": "workspace:*",
    "@hexo-cms/plugin-attachments-helper": "workspace:*",
    "@hexo-cms/plugin-comments-overview": "workspace:*",
    "@hexo-cms/plugin-draft-coach": "workspace:*",
    "@hexo-cms/plugin-seo-inspector": "workspace:*"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "catalog:test",
    "@testing-library/react": "catalog:test",
    "@vitejs/plugin-react": "catalog:build",
    "jsdom": "catalog:test",
    "vitest": "catalog:test"
  },
  "scripts": {
    "test": "vitest run"
  }
}
```

Create `packages/plugins/vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
  },
});
```

Create `packages/plugins/src/__tests__/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `packages/plugins/src/index.ts`:

```ts
export * from "./official";
export * from "./local-dev";
```

Create `packages/plugins/src/local-dev.ts`:

```ts
import type { PluginDefinition } from "@hexo-cms/core";

export const localDevPlugins: PluginDefinition[] = [];
```

- [ ] **Step 3: Create plugin package manifests**

Create `packages/plugins/attachments-helper/package.json`:

```json
{
  "name": "@hexo-cms/plugin-attachments-helper",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@hexo-cms/core": "workspace:*",
    "@hexo-cms/ui": "workspace:*",
    "lucide-react": "catalog:libs"
  },
  "peerDependencies": {
    "react": "catalog:react",
    "react-dom": "catalog:react"
  }
}
```

Create `packages/plugins/comments-overview/package.json`:

```json
{
  "name": "@hexo-cms/plugin-comments-overview",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./pages/comments": "./src/pages/comments.tsx"
  },
  "dependencies": {
    "@hexo-cms/core": "workspace:*",
    "@hexo-cms/ui": "workspace:*",
    "@tanstack/react-router": "^1.169.1",
    "lucide-react": "catalog:libs"
  },
  "peerDependencies": {
    "react": "catalog:react",
    "react-dom": "catalog:react"
  }
}
```

Create `packages/plugins/seo-inspector/package.json`:

```json
{
  "name": "@hexo-cms/plugin-seo-inspector",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@hexo-cms/core": "workspace:*"
  }
}
```

Create `packages/plugins/draft-coach/package.json`:

```json
{
  "name": "@hexo-cms/plugin-draft-coach",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@hexo-cms/core": "workspace:*",
    "@hexo-cms/ui": "workspace:*",
    "lucide-react": "catalog:libs"
  },
  "peerDependencies": {
    "react": "catalog:react",
    "react-dom": "catalog:react"
  }
}
```

- [ ] **Step 4: Move official plugin implementation files**

Run:

```bash
mkdir -p packages/plugins/attachments-helper/src/widgets
mkdir -p packages/plugins/comments-overview/src/widgets packages/plugins/comments-overview/src/pages
mkdir -p packages/plugins/seo-inspector/src/diagnostics
mkdir -p packages/plugins/draft-coach/src
git mv packages/ui/src/plugin/renderers/attachments-summary-widget.tsx packages/plugins/attachments-helper/src/widgets/attachments-summary-widget.tsx
git mv packages/ui/src/plugin/renderers/comments-overview-widget.tsx packages/plugins/comments-overview/src/widgets/comments-overview-widget.tsx
git mv packages/ui/src/pages/comments.tsx packages/plugins/comments-overview/src/pages/comments.tsx
git mv packages/ui/src/plugin/diagnostics/seo-inspector.ts packages/plugins/seo-inspector/src/diagnostics/seo-inspector.ts
git mv packages/ui/src/plugin/draft-coach/draft-checker.ts packages/plugins/draft-coach/src/draft-checker.ts
git mv packages/ui/src/plugin/draft-coach/event-handler.ts packages/plugins/draft-coach/src/event-handler.ts
git mv packages/ui/src/plugin/draft-coach/widget.tsx packages/plugins/draft-coach/src/widget.tsx
```

After the moves, update the imports in the moved files exactly as follows.

In `packages/plugins/attachments-helper/src/widgets/attachments-summary-widget.tsx`:

```ts
import { ATTACHMENTS_HELPER_PLUGIN_ID } from "../manifest";
import { Button, usePluginDataProvider, usePluginSystem } from "@hexo-cms/ui";
```

Remove these old imports from that file:

```ts
import { ATTACHMENTS_HELPER_PLUGIN_ID } from "@hexo-cms/core";
import { Button } from "../../components/ui/button";
import { usePluginDataProvider, usePluginSystem } from "../plugin-provider";
```

In `packages/plugins/comments-overview/src/widgets/comments-overview-widget.tsx`:

```ts
import { COMMENTS_OVERVIEW_PLUGIN_ID } from "../manifest";
import type { PluginConfigValue } from "@hexo-cms/core";
import { Button, usePluginSystem } from "@hexo-cms/ui";
```

Remove these old imports from that file:

```ts
import { COMMENTS_OVERVIEW_PLUGIN_ID, type PluginConfigValue } from "@hexo-cms/core";
import { Button } from "../../components/ui/button";
import { usePluginSystem } from "../plugin-provider";
```

In `packages/plugins/comments-overview/src/pages/comments.tsx`:

```ts
import { COMMENTS_OVERVIEW_PLUGIN_ID } from "../manifest";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Tabs,
  TabsList,
  TabsTrigger,
  useDataProvider,
  usePluginSystem,
} from "@hexo-cms/ui";
```

Remove these old imports from that file:

```ts
import { useDataProvider } from "../context/data-provider-context";
import { usePluginSystem } from "../plugin";
import { COMMENTS_OVERVIEW_PLUGIN_ID } from "@hexo-cms/core";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../components/ui/collapsible";
```

In `packages/plugins/draft-coach/src/widget.tsx`:

```ts
import { DRAFT_COACH_PLUGIN_ID } from "./manifest";
import type { HexoPost } from "@hexo-cms/core";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  useDataProvider,
  usePluginSystem,
} from "@hexo-cms/ui";
```

Remove these old imports from that file:

```ts
import { usePluginSystem } from "../plugin-provider";
import { useDataProvider } from "../../context/data-provider-context";
import { DRAFT_COACH_PLUGIN_ID } from "@hexo-cms/core";
import type { HexoPost } from "@hexo-cms/core";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
```

- [ ] **Step 5: Create Attachments Helper plugin definition**

Create `packages/plugins/attachments-helper/src/manifest.ts`:

```ts
import type { PluginManifest } from "@hexo-cms/core";

export const ATTACHMENTS_HELPER_PLUGIN_ID = "hexo-cms-attachments-helper";

export const attachmentsHelperManifest: PluginManifest = {
  id: ATTACHMENTS_HELPER_PLUGIN_ID,
  name: "Attachments Helper",
  version: "0.1.0",
  description: "Filter media by attachment type and provide copy-link helpers.",
  origin: "official",
  runtime: "hosted",
  engine: { hexoCms: ">=0.1.0" },
  activation: ["onMedia"],
  permissions: [
    "content.read",
    "pluginStorage.read",
    "pluginStorage.write",
    "pluginConfig.write",
    "ui.contribute",
    "command.register",
  ],
  contributes: {
    dashboardWidgets: [
      {
        id: "attachments.summary",
        title: "Attachments Helper",
        renderer: "attachments.summary",
        size: "medium",
        order: 80,
      },
    ],
    settingsPanels: [
      {
        id: "attachments.settings",
        title: "Attachments Helper",
        schema: "attachments.settings",
      },
    ],
    settingsSchemas: {
      "attachments.settings": {
        id: "attachments.settings",
        fields: [
          {
            key: "showDocumentFilter",
            label: "Show document filter",
            type: "boolean",
            defaultValue: true,
            description: "Show document filtering and attachment search in the media library.",
          },
        ],
      },
    },
    sidebarItems: [
      {
        id: "attachments.media-entry",
        title: "Attachments Helper",
        target: "plugin.settings",
      },
    ],
    commands: [
      {
        id: "attachments.copyLink",
        title: "Copy attachment link",
      },
    ],
    uiFlags: [
      {
        id: "media-document-filter",
        flag: "media.documentFilter",
        title: "Media document filter",
        order: 10,
      },
      {
        id: "media-search",
        flag: "media.search",
        title: "Media search",
        order: 20,
      },
    ],
  },
};
```

Create `packages/plugins/attachments-helper/src/plugin.ts`:

```ts
import { definePlugin } from "@hexo-cms/core";
import { AttachmentsSummaryWidget } from "./widgets/attachments-summary-widget";
import { attachmentsHelperManifest } from "./manifest";

export const attachmentsHelperPlugin = definePlugin({
  defaultEnabled: true,
  manifest: attachmentsHelperManifest,
  renderers: {
    "attachments.summary": AttachmentsSummaryWidget,
  },
  commands: {
    "attachments.copyLink": () => async ({ args }) => {
      const value = typeof args[0] === "string" ? args[0] : "";
      if (!value) throw new Error("Attachment link is required.");
      await navigator.clipboard.writeText(value);
      return value;
    },
  },
});
```

Create `packages/plugins/attachments-helper/src/index.ts`:

```ts
export * from "./manifest";
export * from "./plugin";
export { AttachmentsSummaryWidget } from "./widgets/attachments-summary-widget";
```

- [ ] **Step 6: Create Comments Overview plugin definition**

Create `packages/plugins/comments-overview/src/manifest.ts` from the current Comments Overview manifest with these exact contract changes:

```ts
import type { PluginManifest } from "@hexo-cms/core";

export const COMMENTS_OVERVIEW_PLUGIN_ID = "hexo-cms-comments-overview";

export const commentsOverviewManifest: PluginManifest = {
  id: COMMENTS_OVERVIEW_PLUGIN_ID,
  name: "Comments Overview",
  version: "0.1.0",
  description: "Manage Giscus comments backed by GitHub Discussions.",
  origin: "official",
  runtime: "hosted",
  engine: { hexoCms: ">=0.1.0" },
  activation: ["onDashboard"],
  permissions: ["ui.contribute", "pluginConfig.write", "command.register", "network.fetch"],
  network: { allowedHosts: ["api.github.com"] },
  contributes: {
    dashboardWidgets: [
      {
        id: "comments.overview",
        title: "Comments Overview",
        renderer: "comments.overview",
        size: "medium",
        order: 90,
      },
    ],
    settingsPanels: [
      {
        id: "comments.giscus",
        title: "Giscus Comments",
        schema: "comments.giscus",
      },
    ],
    settingsSchemas: {
      "comments.giscus": {
        id: "comments.giscus",
        fields: [
          { key: "giscusRepo", label: "GitHub repository", type: "string", defaultValue: "", required: true, placeholder: "owner/repo" },
          { key: "giscusRepoId", label: "Repository ID", type: "string", defaultValue: "", required: true, placeholder: "R_kgDO..." },
          { key: "giscusCategoryId", label: "Discussion Category ID", type: "string", defaultValue: "", required: true, placeholder: "DIC_kw..." },
          { key: "giscusCategory", label: "Discussion category", type: "string", defaultValue: "General", required: true },
        ],
      },
    },
    sidebarItems: [
      {
        id: "comments.entry",
        title: "Comments",
        target: "/comments",
      },
    ],
    commands: [
      {
        id: "comments.openModeration",
        title: "Open comment management",
      },
    ],
  },
};
```

Create `packages/plugins/comments-overview/src/plugin.ts`:

```ts
import { definePlugin } from "@hexo-cms/core";
import { CommentsOverviewWidget } from "./widgets/comments-overview-widget";
import { commentsOverviewManifest } from "./manifest";

export const commentsOverviewPlugin = definePlugin({
  manifest: commentsOverviewManifest,
  renderers: {
    "comments.overview": CommentsOverviewWidget,
  },
  commands: {
    "comments.openModeration": () => ({ args }) => {
      const url = typeof args[0] === "string" && args[0] ? args[0] : "/comments";
      if (typeof window !== "undefined") window.location.assign(url);
      return url;
    },
  },
});
```

Create `packages/plugins/comments-overview/src/index.ts`:

```ts
export * from "./manifest";
export * from "./plugin";
export { CommentsOverviewWidget } from "./widgets/comments-overview-widget";
export { CommentsPage } from "./pages/comments";
```

- [ ] **Step 7: Create SEO Inspector plugin definition**

Create `packages/plugins/seo-inspector/src/manifest.ts`:

```ts
import type { PluginManifest } from "@hexo-cms/core";

export const SEO_INSPECTOR_PLUGIN_ID = "hexo-cms-seo-inspector";

export const seoInspectorManifest: PluginManifest = {
  id: SEO_INSPECTOR_PLUGIN_ID,
  name: "SEO Inspector",
  version: "0.1.0",
  description: "Check post SEO fields including title length, excerpt, slug, and taxonomy.",
  origin: "official",
  runtime: "hosted",
  engine: { hexoCms: ">=0.1.0" },
  activation: ["onDashboard"],
  permissions: ["content.read", "ui.contribute", "pluginConfig.write"],
  contributes: {
    settingsPanels: [{ id: "seo.settings", title: "SEO Inspector", schema: "seo.settings" }],
    settingsSchemas: {
      "seo.settings": {
        id: "seo.settings",
        fields: [
          { key: "minTitleLength", label: "Minimum title length", type: "string", defaultValue: "10" },
          { key: "maxTitleLength", label: "Maximum title length", type: "string", defaultValue: "60" },
          { key: "requireExcerpt", label: "Require excerpt", type: "boolean", defaultValue: true },
          { key: "requireCategories", label: "Require categories", type: "boolean", defaultValue: true },
        ],
      },
    },
    sidebarItems: [{ id: "seo.entry", title: "SEO Inspector", target: "plugin.settings" }],
    diagnostics: [
      { id: "seo.post-checks", title: "Post SEO checks", scope: "post" },
      { id: "seo.site-checks", title: "Site SEO summary", scope: "site" },
    ],
  },
};
```

Create `packages/plugins/seo-inspector/src/plugin.ts`:

```ts
import { definePlugin } from "@hexo-cms/core";
import { createSeoPostDiagnosticsHandler, createSeoSiteDiagnosticsHandler } from "./diagnostics/seo-inspector";
import { seoInspectorManifest } from "./manifest";

export const seoInspectorPlugin = definePlugin({
  manifest: seoInspectorManifest,
  diagnostics: {
    "seo.post-checks": ({ getConfig }) => createSeoPostDiagnosticsHandler(getConfig),
    "seo.site-checks": ({ getConfig }) => createSeoSiteDiagnosticsHandler(getConfig),
  },
});
```

Create `packages/plugins/seo-inspector/src/index.ts`:

```ts
export * from "./manifest";
export * from "./plugin";
export * from "./diagnostics/seo-inspector";
```

- [ ] **Step 8: Create Draft Coach plugin definition**

Create `packages/plugins/draft-coach/src/manifest.ts`:

```ts
import type { PluginManifest } from "@hexo-cms/core";

export const DRAFT_COACH_PLUGIN_ID = "hexo-cms-draft-coach";

export const draftCoachManifest: PluginManifest = {
  id: DRAFT_COACH_PLUGIN_ID,
  name: "Draft Coach",
  version: "0.1.0",
  description: "Track stale drafts, word targets, and cover-image completeness.",
  origin: "official",
  runtime: "hosted",
  engine: { hexoCms: ">=0.1.0" },
  activation: ["onDashboard"],
  permissions: ["content.read", "event.subscribe", "pluginStorage.read", "pluginStorage.write", "pluginConfig.write", "ui.contribute"],
  contributes: {
    dashboardWidgets: [
      { id: "draft.overview", title: "Draft Coach", renderer: "draft.overview", size: "medium", order: 70 },
    ],
    settingsPanels: [{ id: "draft.settings", title: "Draft Coach", schema: "draft.settings" }],
    settingsSchemas: {
      "draft.settings": {
        id: "draft.settings",
        fields: [
          { key: "draftAgeThreshold", label: "Stale draft days", type: "string", defaultValue: "7" },
          { key: "wordCountTarget", label: "Target word count", type: "string", defaultValue: "800" },
          { key: "requireCover", label: "Require cover image", type: "boolean", defaultValue: true },
          { key: "enableNotifications", label: "Enable notifications", type: "boolean", defaultValue: true },
        ],
      },
    },
    sidebarItems: [{ id: "draft.entry", title: "Draft Coach", target: "plugin.settings" }],
    events: [{ name: "post.afterSave", description: "Check draft state after save" }],
  },
};
```

Create `packages/plugins/draft-coach/src/plugin.ts`:

```ts
import { definePlugin } from "@hexo-cms/core";
import { createDraftCoachEventHandler } from "./event-handler";
import { DraftCoachWidget } from "./widget";
import { draftCoachManifest } from "./manifest";

export const draftCoachPlugin = definePlugin({
  manifest: draftCoachManifest,
  renderers: {
    "draft.overview": DraftCoachWidget,
  },
  events: {
    "post.afterSave": ({ getConfig, storage }) => createDraftCoachEventHandler(getConfig, storage),
  },
});
```

Create `packages/plugins/draft-coach/src/index.ts`:

```ts
export * from "./draft-checker";
export * from "./event-handler";
export * from "./manifest";
export * from "./plugin";
export { DraftCoachWidget } from "./widget";
```

- [ ] **Step 9: Create official plugin list**

Create `packages/plugins/src/official.ts`:

```ts
import { attachmentsHelperPlugin } from "@hexo-cms/plugin-attachments-helper";
import { commentsOverviewPlugin } from "@hexo-cms/plugin-comments-overview";
import { draftCoachPlugin } from "@hexo-cms/plugin-draft-coach";
import { seoInspectorPlugin } from "@hexo-cms/plugin-seo-inspector";

export const officialPlugins = [
  attachmentsHelperPlugin,
  commentsOverviewPlugin,
  seoInspectorPlugin,
  draftCoachPlugin,
];
```

- [ ] **Step 10: Write official plugin tests**

Create `packages/plugins/src/__tests__/official-plugins.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { validatePluginManifest } from "@hexo-cms/core";
import { officialPlugins } from "../official";

describe("official plugins", () => {
  it("exports valid official hosted plugin definitions", () => {
    expect(officialPlugins.map((plugin) => plugin.manifest.id)).toEqual([
      "hexo-cms-attachments-helper",
      "hexo-cms-comments-overview",
      "hexo-cms-seo-inspector",
      "hexo-cms-draft-coach",
    ]);

    for (const plugin of officialPlugins) {
      expect(() => validatePluginManifest(plugin.manifest)).not.toThrow();
      expect(plugin.manifest.origin).toBe("official");
      expect(plugin.manifest.runtime).toBe("hosted");
    }
  });

  it("uses local renderer keys without builtin prefixes", () => {
    const renderers = officialPlugins.flatMap((plugin) =>
      Object.keys(plugin.renderers ?? {}).map((renderer) => `${plugin.manifest.id}:${renderer}`),
    );

    expect(renderers).toContain("hexo-cms-attachments-helper:attachments.summary");
    expect(renderers).toContain("hexo-cms-comments-overview:comments.overview");
    expect(renderers).toContain("hexo-cms-draft-coach:draft.overview");
    expect(renderers.some((renderer) => renderer.includes("builtin."))).toBe(false);
  });

  it("provides renderer implementations for every declared dashboard widget", () => {
    for (const plugin of officialPlugins) {
      for (const widget of plugin.manifest.contributes?.dashboardWidgets ?? []) {
        expect(plugin.renderers?.[widget.renderer]).toEqual(expect.any(Function));
      }
    }
  });
});
```

- [ ] **Step 11: Run plugin package tests**

Run:

```bash
pnpm --filter @hexo-cms/plugins test
```

Expected: PASS.

- [ ] **Step 12: Commit Task 3**

```bash
git add pnpm-workspace.yaml packages/plugins packages/ui/src/plugin packages/ui/src/pages/comments.tsx
git commit -m "feat: extract official plugin packages"
```

---

### Task 4: UI Consumes PluginHost Instead Of Built-In Wiring

**Files:**
- Modify: `packages/ui/src/plugin/plugin-provider.tsx`
- Modify: `packages/ui/src/plugin/extension-outlet.tsx`
- Modify: `packages/ui/src/plugin/plugin-settings.tsx`
- Modify: `packages/ui/src/plugin/index.ts`
- Modify: `packages/ui/src/app-shell.ts`
- Modify: `packages/ui/src/pages/index.tsx`
- Modify: `packages/ui/src/pages/media.tsx`
- Modify: `packages/ui/src/components/layout/CMSLayout.tsx`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/package.json`
- Test: `packages/ui/src/__tests__/plugin-ui.test.tsx`

- [ ] **Step 1: Write failing UI host tests**

In `packages/ui/src/__tests__/plugin-ui.test.tsx`, replace built-in imports with a local test host helper:

```tsx
import type { ComponentType } from "react";
import {
  MemoryPluginConfigStore,
  MemoryPluginLogStore,
  MemoryPluginSecretStore,
  MemoryPluginStateStore,
  MemoryPluginStorageStore,
  type PluginConfigValue,
  PluginCatalog,
  PluginHost,
  definePlugin,
} from "@hexo-cms/core";
```

Add this helper near `renderWithProviders`:

```tsx
function createTestPluginHost(provider = createDataProvider()) {
  const plugin = definePlugin({
    defaultEnabled: true,
    manifest: {
      id: "hexo-cms-ui-test-plugin",
      name: "UI Test Plugin",
      version: "1.0.0",
      description: "UI test plugin",
      origin: "official",
      runtime: "hosted",
      permissions: ["ui.contribute", "pluginConfig.write"],
      contributes: {
        dashboardWidgets: [
          { id: "ui.widget", title: "UI Widget", renderer: "ui.widget", size: "medium" },
        ],
        settingsPanels: [
          { id: "ui.settings", title: "UI Settings", schema: "ui.settings" },
        ],
        settingsSchemas: {
          "ui.settings": {
            id: "ui.settings",
            fields: [
              { key: "enabled", label: "Enabled", type: "boolean", defaultValue: true },
            ],
          },
        },
        uiFlags: [
          { id: "media-documents", flag: "media.documentFilter", title: "Media documents" },
        ],
      },
    },
    renderers: {
      "ui.widget": () => <div>Host renderer output</div>,
    },
  });

  return new PluginHost<ComponentType<{ config?: PluginConfigValue }>>({
    catalog: new PluginCatalog<ComponentType<{ config?: PluginConfigValue }>>([plugin]),
    stateStore: new MemoryPluginStateStore(),
    configStore: new MemoryPluginConfigStore(),
    storageStore: new MemoryPluginStorageStore(),
    secretStore: new MemoryPluginSecretStore(),
    logStore: new MemoryPluginLogStore(),
    dataProvider: provider,
  });
}
```

Update `renderWithProviders` to pass a host:

```tsx
function renderWithProviders(ui: React.ReactNode, provider = createDataProvider()) {
  const host = createTestPluginHost(provider);
  return render(
    <DataProviderProvider provider={provider}>
      <PluginProvider host={host}>{ui}</PluginProvider>
    </DataProviderProvider>,
  );
}
```

Add test:

```tsx
it("renders dashboard widgets with host-provided renderers", async () => {
  function HostWidgets() {
    const { snapshot, getDashboardWidgetRenderer } = usePluginSystem();
    const dashboardWidgets = DashboardExtensionOutlet({
      widgets: snapshot.extensions.dashboardWidgets,
      getRenderer: getDashboardWidgetRenderer,
    });
    return <>{dashboardWidgets.map((widget) => widget.content)}</>;
  }

  renderWithProviders(<HostWidgets />);
  expect(await screen.findByText("Host renderer output")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing UI tests**

Run:

```bash
pnpm --filter @hexo-cms/ui test -- plugin-ui.test.tsx
```

Expected: FAIL because `PluginProvider` does not accept `host` and `DashboardExtensionOutlet` does not accept `getRenderer`.

- [ ] **Step 3: Update `PluginProvider` to consume a host**

Modify `packages/ui/src/plugin/plugin-provider.tsx` so the public props are:

```ts
import { createContext, useCallback, useContext, useMemo, useState, type ComponentType } from "react";
import type {
  DiagnosticsReport,
  DiagnosticsTarget,
  PluginCommandExecutionResult,
  PluginConfigValue,
  PluginHost,
  PluginManagerSnapshot,
  PluginRuntimeErrorInput,
  RegisteredDashboardWidget,
} from "@hexo-cms/core";
```

Context value:

```ts
interface PluginContextValue {
  host: PluginHost<ComponentType<{ config?: PluginConfigValue }>>;
  snapshot: PluginManagerSnapshot;
  enablePlugin: (pluginId: string) => void;
  disablePlugin: (pluginId: string) => void;
  updatePluginConfig: (pluginId: string, config: PluginConfigValue) => void;
  recordPluginError: (pluginId: string, error: PluginRuntimeErrorInput) => void;
  executePluginCommand: (pluginId: string, commandId: string, args?: unknown[]) => Promise<PluginCommandExecutionResult>;
  runDiagnostics: (target: DiagnosticsTarget) => Promise<DiagnosticsReport[]>;
  getDashboardWidgetRenderer: (widget: RegisteredDashboardWidget) => ComponentType<{ config?: PluginConfigValue }> | undefined;
}
```

Provider:

```tsx
export function PluginProvider({
  children,
  host,
}: {
  children: React.ReactNode;
  host: PluginHost<ComponentType<{ config?: PluginConfigValue }>>;
}) {
  const dataProvider = useDataProvider();
  const [snapshot, setSnapshot] = useState<PluginManagerSnapshot>(() => host.snapshot());

  const eventDataProvider = useMemo(
    () =>
      withPluginEvents(dataProvider, async (eventName, payload) => {
        await host.emitEvent(eventName, payload);
        setSnapshot(host.snapshot());
      }),
    [dataProvider, host],
  );

  const enablePlugin = useCallback((pluginId: string) => {
    setSnapshot(host.enablePlugin(pluginId));
  }, [host]);

  const disablePlugin = useCallback((pluginId: string) => {
    setSnapshot(host.disablePlugin(pluginId));
  }, [host]);

  const updatePluginConfig = useCallback((pluginId: string, config: PluginConfigValue) => {
    setSnapshot(host.updatePluginConfig(pluginId, config));
  }, [host]);

  const recordPluginError = useCallback((pluginId: string, error: PluginRuntimeErrorInput) => {
    setSnapshot(host.recordPluginError(pluginId, error));
  }, [host]);

  const executePluginCommand = useCallback(async (pluginId: string, commandId: string, args: unknown[] = []) => {
    const result = await host.executePluginCommand(pluginId, commandId, args);
    if (!result.ok && result.error) {
      setSnapshot(host.recordPluginError(pluginId, {
        contributionId: commandId,
        contributionType: "command",
        message: result.error.message,
        code: result.error.code,
      }));
    }
    return result;
  }, [host]);

  const runDiagnostics = useCallback(async (target: DiagnosticsTarget): Promise<DiagnosticsReport[]> => {
    const reports = await host.runDiagnostics(target);
    setSnapshot(host.snapshot());
    return reports;
  }, [host]);

  const getDashboardWidgetRenderer = useCallback(
    (widget: RegisteredDashboardWidget) => host.getDashboardWidgetRenderer(widget),
    [host],
  );

  const contextValue = useMemo(() => ({
    host,
    snapshot,
    enablePlugin,
    disablePlugin,
    updatePluginConfig,
    recordPluginError,
    executePluginCommand,
    runDiagnostics,
    getDashboardWidgetRenderer,
  }), [host, snapshot, enablePlugin, disablePlugin, updatePluginConfig, recordPluginError, executePluginCommand, runDiagnostics, getDashboardWidgetRenderer]);

  return (
    <PluginContext.Provider value={contextValue}>
      <DataProviderProvider provider={eventDataProvider}>{children}</DataProviderProvider>
    </PluginContext.Provider>
  );
}
```

Remove all imports of official plugin ids, official manifests, command handlers, and diagnostics handlers from this file.

- [ ] **Step 4: Update dashboard outlet**

Modify `packages/ui/src/plugin/extension-outlet.tsx`:

```tsx
import type { ComponentType } from "react";
import type { PluginConfigValue, RegisteredDashboardWidget } from "@hexo-cms/core";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { PluginErrorBoundary } from "./plugin-error-boundary";

type DashboardWidgetRenderer = ComponentType<{ config?: PluginConfigValue }>;

interface DashboardExtensionOutletProps {
  widgets: RegisteredDashboardWidget[];
  configs?: Record<string, PluginConfigValue>;
  getRenderer: (widget: RegisteredDashboardWidget) => DashboardWidgetRenderer | undefined;
}

export function DashboardExtensionOutlet({ widgets, configs, getRenderer }: DashboardExtensionOutletProps) {
  return widgets.map((widget) => ({
    id: `${widget.pluginId}:${widget.id}`,
    title: widget.title,
    content: (
      <DashboardWidgetFrame
        key={`${widget.pluginId}:${widget.id}`}
        widget={widget}
        config={configs?.[widget.pluginId]}
        getRenderer={getRenderer}
      />
    ),
  }));
}

function DashboardWidgetFrame({
  widget,
  config,
  getRenderer,
}: {
  widget: RegisteredDashboardWidget;
  config?: PluginConfigValue;
  getRenderer: (widget: RegisteredDashboardWidget) => DashboardWidgetRenderer | undefined;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{widget.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <PluginErrorBoundary
          pluginId={widget.pluginId}
          contributionId={widget.id}
          contributionType="dashboard.widget"
        >
          <PluginRenderer widget={widget} config={config} getRenderer={getRenderer} />
        </PluginErrorBoundary>
      </CardContent>
    </Card>
  );
}

function PluginRenderer({
  widget,
  config,
  getRenderer,
}: {
  widget: RegisteredDashboardWidget;
  config?: PluginConfigValue;
  getRenderer: (widget: RegisteredDashboardWidget) => DashboardWidgetRenderer | undefined;
}) {
  const Renderer = getRenderer(widget);
  if (Renderer) return <Renderer config={config} />;

  return (
    <div className="rounded-lg border border-[var(--status-warning)] bg-[var(--status-warning-bg)] p-3 text-sm text-[var(--status-warning)]">
      Missing plugin renderer: {widget.renderer}
    </div>
  );
}
```

- [ ] **Step 5: Update DashboardPage to pass renderer resolver**

Modify `packages/ui/src/pages/index.tsx`:

```ts
const { snapshot, getDashboardWidgetRenderer } = usePluginSystem();
```

And:

```ts
const pluginWidgets = DashboardExtensionOutlet({
  widgets: snapshot.extensions.dashboardWidgets,
  configs: Object.fromEntries(snapshot.plugins.map(({ manifest, config }) => [manifest.id, config])),
  getRenderer: getDashboardWidgetRenderer,
});
```

- [ ] **Step 6: Replace Attachments-specific UI checks with uiFlags**

Modify `packages/ui/src/pages/media.tsx`:

```ts
const hasDocumentFilter = snapshot.extensions.uiFlags.some(
  (flag) => flag.flag === "media.documentFilter",
);
const hasMediaSearch = snapshot.extensions.uiFlags.some(
  (flag) => flag.flag === "media.search",
);
const filterOptions = hasDocumentFilter
  ? [...CORE_FILTER_OPTIONS, ATTACHMENT_FILTER_OPTION]
  : CORE_FILTER_OPTIONS;
```

Replace `attachmentsPluginEnabled` references with the relevant generic flags:

```ts
if (!hasDocumentFilter && activeFilter === ATTACHMENT_FILTER_OPTION) {
  setActiveFilter("全部");
}
if (!hasMediaSearch && search) {
  setSearch("");
}
```

Modify `packages/ui/src/components/layout/CMSLayout.tsx`:

```ts
const showTopbarSearch = pathname !== "/media" || snapshot.extensions.uiFlags.some(
  (flag) => flag.flag === "media.search",
);
```

Remove `ATTACHMENTS_HELPER_PLUGIN_ID` imports from UI files.

- [ ] **Step 7: Update settings panel text and origin/runtime display**

Modify plugin card metadata in `packages/ui/src/plugin/plugin-settings.tsx`:

```tsx
<p className="text-xs text-[var(--text-tertiary)]">
  {manifest.id} / v{manifest.version} / {manifest.origin} / {manifest.runtime}
</p>
```

Update the card description:

```tsx
<CardDescription>Manage plugins, permissions, settings, and runtime status</CardDescription>
```

Update policy text:

```tsx
<CardDescription>Plugins run through the host capability model</CardDescription>
```

Keep button labels and existing layout consistent with the current design.

- [ ] **Step 8: Remove official plugin exports from UI**

Modify `packages/ui/src/plugin/index.ts` so it exports host platform APIs only:

```ts
export { AuditLogPanel } from "./audit-log-panel";
export { DashboardExtensionOutlet } from "./extension-outlet";
export { DiagnosticsPanel } from "./diagnostics-panel";
export {
  DesktopPluginConfigStore,
  WebPluginConfigStore,
  createPlatformPluginConfigStore,
} from "./platform-plugin-config";
export {
  createPlatformPluginFetch,
  desktopPluginFetch,
  webPluginFetch,
  getAuditLogStore,
} from "./platform-plugin-http";
export {
  DesktopPluginLogStore,
  WebPluginLogStore,
  createPlatformPluginLogStore,
} from "./platform-plugin-log";
export {
  DesktopPluginSecretStore,
  WebPluginSecretStore,
  createPlatformPluginSecretStore,
} from "./platform-plugin-secret";
export {
  DesktopPluginStateStore,
  WebPluginStateStore,
  createPlatformPluginStateStore,
} from "./platform-plugin-state";
export {
  DesktopPluginStorageStore,
  WebPluginStorageStore,
  createPlatformPluginStorageStore,
} from "./platform-plugin-storage";
export { PluginErrorBoundary } from "./plugin-error-boundary";
export { withPluginEvents, type PluginEventEmitter } from "./plugin-event-data-provider";
export { PluginProvider, usePluginSystem, usePluginDataProvider } from "./plugin-provider";
export { PluginSettingsPanel } from "./plugin-settings";
```

Remove these old official plugin exports from `packages/ui/src/plugin/index.ts`:

```ts
export { DraftCoachWidget } from "./draft-coach/widget";
export {
  checkPostSeo,
  createSeoPostDiagnosticsHandler,
  createSeoSiteDiagnosticsHandler,
} from "./diagnostics/seo-inspector";
export {
  checkDraft,
  calculateDraftStats,
} from "./draft-coach/draft-checker";
```

Modify `packages/ui/package.json` and remove:

```json
"./pages/comments": "./src/pages/comments.tsx",
```

Modify `packages/ui/src/index.ts` and remove:

```ts
export { CommentsPage } from "./pages/comments";
```

Modify the plugin exports in `packages/ui/src/index.ts` to expose host adapters needed by Web/Desktop:

```ts
export {
  DashboardExtensionOutlet,
  PluginErrorBoundary,
  PluginProvider,
  PluginSettingsPanel,
  createPlatformPluginConfigStore,
  createPlatformPluginFetch,
  createPlatformPluginLogStore,
  createPlatformPluginSecretStore,
  createPlatformPluginStateStore,
  createPlatformPluginStorageStore,
  getAuditLogStore,
  usePluginDataProvider,
  usePluginSystem,
  withPluginEvents,
} from "./plugin";
```

- [ ] **Step 9: Run UI tests**

Run:

```bash
pnpm --filter @hexo-cms/ui test -- plugin-ui.test.tsx
```

Expected: PASS after test helper and assertions are updated to the host model.

- [ ] **Step 10: Commit Task 4**

```bash
git add packages/ui
git commit -m "feat: make ui consume plugin host"
```

---

### Task 5: Web And Desktop Host Bootstrap

**Files:**
- Modify: `packages/web/package.json`
- Create: `packages/web/src/lib/plugin-host.ts`
- Modify: `packages/web/src/routes/__root.tsx`
- Modify: `packages/web/src/routes/comments.tsx`
- Modify: `packages/web/src/routes/api/plugin/fetch.ts`
- Modify/Test: `packages/web/src/lib/plugin-security.test.ts`
- Modify: `packages/desktop/package.json`
- Create: `packages/desktop/src/renderer/src/lib/plugin-host.ts`
- Modify: `packages/desktop/src/renderer/src/routes/__root.tsx`
- Modify: `packages/desktop/src/renderer/src/routes/comments.tsx`
- Modify: `packages/desktop/src/main/index.ts`
- Modify: `packages/desktop/src/main/plugin-http-proxy.ts`
- Modify/Test: `packages/desktop/src/main/plugin-http-proxy.test.ts`

- [ ] **Step 1: Add plugin package dependency**

Add to `packages/web/package.json` dependencies:

```json
"@hexo-cms/plugins": "workspace:*"
```

Add to `packages/desktop/package.json` dependencies:

```json
"@hexo-cms/plugins": "workspace:*"
```

- [ ] **Step 2: Create Web plugin host factory**

Create `packages/web/src/lib/plugin-host.ts`:

```ts
import { PluginCatalog, PluginHost, StaticPluginSourceResolver, type PluginConfigValue } from "@hexo-cms/core";
import type { ComponentType } from "react";
import { officialPlugins, localDevPlugins } from "@hexo-cms/plugins";
import {
  createPlatformPluginConfigStore,
  createPlatformPluginFetch,
  createPlatformPluginLogStore,
  createPlatformPluginSecretStore,
  createPlatformPluginStateStore,
  createPlatformPluginStorageStore,
} from "@hexo-cms/ui";
import { webDataProvider } from "./web-data-provider-instance";

export async function createWebPluginHost() {
  const catalog = await PluginCatalog.discover<ComponentType<{ config?: PluginConfigValue }>>([
    new StaticPluginSourceResolver("official", officialPlugins),
    new StaticPluginSourceResolver("local-dev", localDevPlugins, {
      enabled: import.meta.env.DEV,
    }),
  ]);

  return new PluginHost<ComponentType<{ config?: PluginConfigValue }>>({
    catalog,
    stateStore: createPlatformPluginStateStore(),
    configStore: createPlatformPluginConfigStore(),
    storageStore: createPlatformPluginStorageStore(),
    secretStore: createPlatformPluginSecretStore(),
    logStore: createPlatformPluginLogStore(),
    fetchImpl: createPlatformPluginFetch(),
    dataProvider: webDataProvider,
  });
}

export async function getWebPluginManifests() {
  const localDevEnabled = import.meta.env.DEV;
  const catalog = await PluginCatalog.discover([
    new StaticPluginSourceResolver("official", officialPlugins),
    new StaticPluginSourceResolver("local-dev", localDevPlugins, { enabled: localDevEnabled }),
  ]);
  return catalog.manifests();
}
```

- [ ] **Step 3: Pass Web host into root route**

Modify `packages/web/src/routes/__root.tsx`:

```ts
import type { PluginHost, PluginConfigValue } from "@hexo-cms/core";
import type { ComponentType } from "react";
import { createWebPluginHost } from "../lib/plugin-host";
```

Add state:

```ts
const [pluginHost, setPluginHost] = useState<PluginHost<ComponentType<{ config?: PluginConfigValue }>> | null>(null);
```

Reset `pluginHost` at the start of the existing session/config effect and load it after auth state is known:

```ts
setPluginHost(null);

if (nextSession.state === "authenticated") {
  const [config, host] = await Promise.all([
    webDataProvider.getConfig(),
    createWebPluginHost(),
  ]);
  if (active) {
    setHasConfig(Boolean(config));
    setPluginHost(host);
  }
} else if (active) {
  setHasConfig(null);
  setPluginHost(null);
}
```

Include host in pending guard:

```ts
const guardPending =
  isPending ||
  (session?.state === "authenticated" && hasConfig === null && !isSetupRoute) ||
  (session?.state === "authenticated" && !isPublicRoute && !isSetupRoute && !pluginHost);
```

Pass host:

```tsx
<PluginProvider host={pluginHost}>
```

Because `pluginHost` is nullable before the guard returns, keep public/setup routes outside `PluginProvider`, then narrow `pluginHost` before rendering authenticated app routes:

```tsx
if (isPublicRoute || isSetupRoute) {
  return (
    <DataProviderProvider provider={webDataProvider}>
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </DataProviderProvider>
  );
}

if (!pluginHost) return null;

return (
  <DataProviderProvider provider={webDataProvider}>
    <PluginProvider host={pluginHost}>
      <ErrorBoundary>
        <CMSLayout
          authClient={webAuthClient}
          onSignedOut={() => navigate({ to: "/login", replace: true })}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </CMSLayout>
      </ErrorBoundary>
    </PluginProvider>
  </DataProviderProvider>
);
```

- [ ] **Step 4: Update Web comments route import**

Modify `packages/web/src/routes/comments.tsx`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { CommentsPage } from "@hexo-cms/plugin-comments-overview/pages/comments";

export const Route = createFileRoute("/comments")({ component: CommentsPage });
```

- [ ] **Step 5: Use catalog manifests in Web plugin fetch route**

Modify `packages/web/src/routes/api/plugin/fetch.ts`:

```ts
import { PermissionBroker, assertPluginHttpRequestAllowed } from "@hexo-cms/core";
import { getWebPluginManifests } from "../../../lib/plugin-host";
```

Inside POST handler before policy checks:

```ts
const manifests = await getWebPluginManifests();
const permissionBroker = new PermissionBroker(manifests);
const manifest = manifests.find((plugin) => plugin.id === req.pluginId);
if (!manifest) return json({ error: "Unknown plugin" }, 403);
parsedUrl = assertPluginHttpRequestAllowed(req.pluginId, manifest, permissionBroker, req.url);
```

Remove module-level:

```ts
const permissionBroker = new PermissionBroker(builtinPluginManifests);
```

- [ ] **Step 6: Update Web plugin security test**

In `packages/web/src/lib/plugin-security.test.ts`, add a passing test for the official comments plugin:

```ts
it("allows official network-enabled plugin fetches through catalog manifests", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{\"ok\":true}", {
    status: 200,
    headers: { "content-type": "application/json" },
  })));

  const { Route } = await import("../routes/api/plugin/fetch");
  const response = await getHandlers(Route).POST({
    request: new Request("http://localhost/api/plugin/fetch", {
      method: "POST",
      body: JSON.stringify({
        pluginId: "hexo-cms-comments-overview",
        url: "https://api.github.com/repos/octocat/hello-world",
      }),
    }),
  });

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ ok: true, status: 200 });
});
```

- [ ] **Step 7: Create Desktop renderer plugin host factory**

Create `packages/desktop/src/renderer/src/lib/plugin-host.ts`:

```ts
import { PluginCatalog, PluginHost, StaticPluginSourceResolver, type PluginConfigValue } from "@hexo-cms/core";
import type { ComponentType } from "react";
import { officialPlugins, localDevPlugins } from "@hexo-cms/plugins";
import {
  createPlatformPluginConfigStore,
  createPlatformPluginFetch,
  createPlatformPluginLogStore,
  createPlatformPluginSecretStore,
  createPlatformPluginStateStore,
  createPlatformPluginStorageStore,
} from "@hexo-cms/ui";
import { desktopDataProvider } from "./desktop-data-provider-instance";

export async function createDesktopPluginHost() {
  const catalog = await PluginCatalog.discover<ComponentType<{ config?: PluginConfigValue }>>([
    new StaticPluginSourceResolver("official", officialPlugins),
    new StaticPluginSourceResolver("local-dev", localDevPlugins, {
      enabled: import.meta.env.DEV,
    }),
  ]);

  return new PluginHost<ComponentType<{ config?: PluginConfigValue }>>({
    catalog,
    stateStore: createPlatformPluginStateStore(),
    configStore: createPlatformPluginConfigStore(),
    storageStore: createPlatformPluginStorageStore(),
    secretStore: createPlatformPluginSecretStore(),
    logStore: createPlatformPluginLogStore(),
    fetchImpl: createPlatformPluginFetch(),
    dataProvider: desktopDataProvider,
  });
}
```

- [ ] **Step 8: Pass Desktop host into root route**

Modify `packages/desktop/src/renderer/src/routes/__root.tsx`:

```ts
import type { PluginConfigValue, PluginHost } from "@hexo-cms/core";
import type { ComponentType } from "react";
import { createDesktopPluginHost } from "../lib/plugin-host";
```

Add state:

```ts
const [pluginHost, setPluginHost] = useState<PluginHost<ComponentType<{ config?: PluginConfigValue }>> | null>(null);
```

Reset `pluginHost` at the start of `refreshSession`, then load it with the config for authenticated sessions:

```ts
setPluginHost(null);

if (nextSession.state === "authenticated") {
  const [config, host] = await Promise.all([
    desktopDataProvider.getConfig(),
    createDesktopPluginHost(),
  ]);
  if (active) {
    setHasConfig(Boolean(config));
    setPluginHost(host);
  }
} else if (active) {
  setHasConfig(null);
  setPluginHost(null);
}
```

Include host in the pending guard:

```ts
const guardPending =
  isPending ||
  (session?.state === "authenticated" && hasConfig === null && !isSetupRoute) ||
  (session?.state === "authenticated" && !isPublicRoute && !isSetupRoute && !pluginHost);
```

Keep the existing public/setup return outside `PluginProvider`, then narrow `pluginHost` before rendering authenticated app routes:

```tsx
if (isPublicRoute || isSetupRoute) return <ErrorBoundary><Outlet /></ErrorBoundary>;

if (!pluginHost) return null;

return (
  <DataProviderProvider provider={desktopDataProvider}>
    <PluginProvider host={pluginHost}>
      <ErrorBoundary>
        {updater && <UpdateBanner updater={updater} />}
        <CMSLayout
          isElectron
          authClient={desktopAuthClient}
          onSignedOut={() => navigate({ to: "/login", replace: true })}
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </CMSLayout>
      </ErrorBoundary>
    </PluginProvider>
  </DataProviderProvider>
);
```

The provider call must pass the narrowed host:

```tsx
<PluginProvider host={pluginHost}>
```

- [ ] **Step 9: Update Desktop comments route import**

Modify `packages/desktop/src/renderer/src/routes/comments.tsx`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { CommentsPage } from "@hexo-cms/plugin-comments-overview/pages/comments";

export const Route = createFileRoute("/comments")({
  component: CommentsPage,
});
```

- [ ] **Step 10: Remove default built-in manifests from Desktop HTTP proxy**

Modify `packages/desktop/src/main/plugin-http-proxy.ts`:

```ts
import {
  PermissionBroker,
  assertPluginHttpRequestAllowed,
  type PluginHttpPermissionBroker,
  type PluginManifest,
} from "@hexo-cms/core";
```

Change options:

```ts
export interface PluginHttpProxyOptions {
  appendAudit(entry: PluginNetworkAuditEntryInput): void;
  manifests: PluginManifest[];
  fetchImpl?: typeof fetch;
  permissionBroker?: PluginHttpPermissionBroker;
  maxResponseSize?: number;
  defaultTimeoutMs?: number;
}
```

Change factory signature:

```ts
export function createPluginHttpProxy({
  appendAudit,
  manifests,
  fetchImpl = defaultFetch,
  permissionBroker = new PermissionBroker(manifests),
  maxResponseSize = DEFAULT_MAX_RESPONSE_SIZE,
  defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
}: PluginHttpProxyOptions) {
```

Modify `packages/desktop/src/main/index.ts`:

```ts
import { officialPlugins } from "@hexo-cms/plugins";
```

Add:

```ts
const officialPluginManifests = officialPlugins.map((plugin) => plugin.manifest);
```

Pass:

```ts
const pluginHttpProxy = createPluginHttpProxy({
  manifests: officialPluginManifests,
  appendAudit: (entry) => desktopPersistence.appendPluginNetworkAudit(entry),
});
```

- [ ] **Step 11: Update Desktop proxy tests**

In `packages/desktop/src/main/plugin-http-proxy.test.ts`, change fixture manifests to:

```ts
const networkPlugin: PluginManifest = {
  id: "hexo-cms-network-plugin",
  name: "Network Plugin",
  version: "1.0.0",
  description: "Fetches allowed URLs",
  origin: "official",
  runtime: "hosted",
  permissions: ["network.fetch"],
  network: { allowedHosts: ["api.example.com"] },
};
```

Remove tests or helper defaults that rely on omitted manifests. The required `manifests: PluginManifest[]` option is enforced by TypeScript, and runtime behavior is covered by the existing allowed/disallowed host tests using explicit manifests.

- [ ] **Step 12: Run Web and Desktop tests**

Run:

```bash
pnpm --filter @hexo-cms/web test -- plugin-security.test.ts
pnpm --filter @hexo-cms/desktop test -- plugin-http-proxy.test.ts
```

Expected: PASS.

- [ ] **Step 13: Commit Task 5**

```bash
git add packages/web packages/desktop packages/plugins
git commit -m "feat: wire plugin host into web and desktop"
```

---

### Task 6: Remove Old Built-In Plugin Coupling

**Files:**
- Delete: `packages/core/src/plugin/builtin.ts`
- Modify: `packages/core/src/plugin/index.ts`
- Modify all files returned by `rg -n "builtinPluginManifests|source: \"builtin\"|builtin\\.|ATTACHMENTS_HELPER_PLUGIN_ID|COMMENTS_OVERVIEW_PLUGIN_ID|SEO_INSPECTOR_PLUGIN_ID|DRAFT_COACH_PLUGIN_ID" packages -S`
- Modify docs only if tests or imports reference stale paths in active docs

- [ ] **Step 1: Run coupling search**

Run:

```bash
rg -n "builtinPluginManifests|source: \"builtin\"|builtin\\." packages -S
```

Expected before cleanup: matches in core tests, old built-in file, UI tests, Web fetch route, Desktop proxy, and moved plugin files if imports were not updated.

- [ ] **Step 2: Delete built-in manifest file**

Run:

```bash
git rm packages/core/src/plugin/builtin.ts
```

Ensure `packages/core/src/plugin/index.ts` does not export `./builtin`.

- [ ] **Step 3: Remove official plugin ids from core imports**

Run:

```bash
rg -n "ATTACHMENTS_HELPER_PLUGIN_ID|COMMENTS_OVERVIEW_PLUGIN_ID|SEO_INSPECTOR_PLUGIN_ID|DRAFT_COACH_PLUGIN_ID" packages -S
```

Expected allowed matches after cleanup:

- `packages/plugins/attachments-helper/src/manifest.ts`
- `packages/plugins/comments-overview/src/manifest.ts`
- `packages/plugins/seo-inspector/src/manifest.ts`
- `packages/plugins/draft-coach/src/manifest.ts`
- plugin package tests

No `@hexo-cms/core` import should provide official plugin ids.

- [ ] **Step 4: Remove stale UI plugin implementation folders**

Run:

```bash
find packages/ui/src/plugin -maxdepth 3 -type f | sort
```

Expected remaining plugin UI host files:

- `packages/ui/src/plugin/audit-log-panel.tsx`
- `packages/ui/src/plugin/diagnostics-panel.tsx`
- `packages/ui/src/plugin/extension-outlet.tsx`
- `packages/ui/src/plugin/index.ts`
- `packages/ui/src/plugin/platform-plugin-config.ts`
- `packages/ui/src/plugin/platform-plugin-http.ts`
- `packages/ui/src/plugin/platform-plugin-log.ts`
- `packages/ui/src/plugin/platform-plugin-secret.ts`
- `packages/ui/src/plugin/platform-plugin-state.ts`
- `packages/ui/src/plugin/platform-plugin-storage.ts`
- `packages/ui/src/plugin/platform-sync-store.ts`
- `packages/ui/src/plugin/plugin-error-boundary.tsx`
- `packages/ui/src/plugin/plugin-event-data-provider.ts`
- `packages/ui/src/plugin/plugin-provider.tsx`
- `packages/ui/src/plugin/plugin-settings.tsx`

- [ ] **Step 5: Verify coupling is gone**

Run:

```bash
rg -n "builtinPluginManifests|source: \"builtin\"|builtin\\." packages -S
```

Expected: no output.

- [ ] **Step 6: Commit Task 6**

```bash
git add packages
git commit -m "refactor: remove built-in plugin coupling"
```

---

### Task 7: Full Verification And Documentation Alignment

**Files:**
- Modify: `docs/plugin/TECHNICAL_DESIGN_PLUGIN_SYSTEM.md`
- Modify: `docs/plugin/PRD_PLUGIN_SYSTEM.md`
- Modify: `docs/ai/project-context.md`
- Optional Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Update active plugin docs**

In `docs/plugin/TECHNICAL_DESIGN_PLUGIN_SYSTEM.md`, replace descriptions of built-in plugin manifests in core with:

```markdown
Official plugins are workspace plugin packages loaded through the same PluginCatalog and PluginHost path as local-dev plugins. Core owns the plugin contracts, validation, permissions, and runtime APIs, but it does not import official plugin implementation code.
```

In `docs/plugin/PRD_PLUGIN_SYSTEM.md`, replace product wording that says only "trusted built-in plugins" with:

```markdown
The first supported origins are official workspace plugins and dev-only local plugins. Both origins use the same manifest, permission, settings, command, diagnostics, event, and UI outlet model.
```

In `docs/ai/project-context.md`, update the package responsibility row for `@hexo-cms/core`:

```markdown
| `@hexo-cms/core` | TypeScript | GitHubService, shared types, DataProvider, plugin platform contracts and runtime APIs; no official plugin business code |
```

Add a row for official plugin packages:

```markdown
| `@hexo-cms/plugins` and `packages/plugins/*` | TypeScript + React | Official plugin packages and official plugin registry loaded through PluginCatalog |
```

- [ ] **Step 2: Run package tests**

Run:

```bash
pnpm --filter @hexo-cms/core test
pnpm --filter @hexo-cms/plugins test
pnpm --filter @hexo-cms/ui test
pnpm --filter @hexo-cms/web test
pnpm --filter @hexo-cms/desktop test
```

Expected: all commands exit 0.

- [ ] **Step 3: Run builds**

Run:

```bash
pnpm --filter @hexo-cms/web build
pnpm --filter @hexo-cms/desktop build
```

Expected: both commands exit 0. TanStack API route warnings that already exist are acceptable if builds succeed.

- [ ] **Step 4: Run final coupling checks**

Run:

```bash
rg -n "builtinPluginManifests|source: \"builtin\"|builtin\\." packages -S
rg -n "from \"@hexo-cms/core\".*(ATTACHMENTS_HELPER_PLUGIN_ID|COMMENTS_OVERVIEW_PLUGIN_ID|SEO_INSPECTOR_PLUGIN_ID|DRAFT_COACH_PLUGIN_ID)" packages -S
```

Expected: no output.

- [ ] **Step 5: Confirm official plugin functionality manually**

Run Web:

```bash
pnpm --filter @hexo-cms/web dev
```

Expected checks in browser:

- Settings shows official plugins with `official` and `hosted`.
- Attachments Helper is enabled by default.
- Dashboard renders Attachments Helper, Comments Overview when enabled, and Draft Coach when enabled.
- Media page document filter appears only when Attachments Helper is enabled.
- Comments route renders from `@hexo-cms/plugin-comments-overview`.
- SEO diagnostics still run from the settings/editor diagnostics entry points that currently call `runDiagnostics`.

Stop the dev server before finalizing.

- [ ] **Step 6: Commit Task 7**

```bash
git add docs packages pnpm-workspace.yaml pnpm-lock.yaml
git commit -m "docs: align plugin architecture docs"
```

---

## Execution Notes

- This plan intentionally does not preserve `builtinPluginManifests`, `source: "builtin"`, or `builtin.*` renderer keys.
- Official plugin ids move out of `@hexo-cms/core`.
- `@hexo-cms/ui` should not import official plugin packages except through test fixtures. Web/Desktop routes may import official plugin pages while file-based routing remains static.
- `pnpm install` may be required after adding workspace packages so `pnpm-lock.yaml` includes the new package graph.
- If a route tree generated file changes after route import updates, commit the generated route file with the task that changed the route.
