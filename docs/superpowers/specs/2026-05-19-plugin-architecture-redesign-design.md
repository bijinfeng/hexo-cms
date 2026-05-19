# Plugin Architecture Redesign - Design Spec

**Date**: 2026-05-19
**Status**: Approved for written review
**Scope**: Plugin platform architecture

## 1. Problem & Goals

Hexo CMS already has a plugin system, but the current implementation still treats built-in plugins as special runtime objects. Official plugin manifests live in `packages/core/src/plugin/builtin.ts`, official plugin renderers and handlers live inside `packages/ui/src/plugin`, and Web/Desktop platform code still reads the built-in manifest list directly.

This creates the exact split the next phase needs to avoid: one path for built-in plugins and another path for third-party plugins.

### Goals

- Treat official plugins as normal plugins from an `official` origin.
- Keep `@hexo-cms/core` focused on plugin platform mechanisms only.
- Move all official plugin business code into independent plugin packages.
- Use one discovery, loading, validation, permission, registration, and execution path for official and third-party plugins.
- Support official workspace plugins and local development plugins first.
- Preserve the existing plugin capabilities where possible: manifest, permissions, storage, secrets, network proxy, events, logs, diagnostics, commands, settings schema, dashboard widgets.

### Non-Goals

- No compatibility layer for the old built-in plugin API. The product has not shipped.
- No plugin marketplace, signing, review workflow, ratings, or automatic plugin updates in this redesign.
- No arbitrary production plugin installation from npm, zip, tgz, or remote URL in the first implementation.
- No direct plugin access to GitHub OAuth tokens, raw Electron IPC, shell, or unrestricted filesystem APIs.

## 2. Current Coupling To Remove

The current code has several direct built-in plugin assumptions:

- `packages/core/src/plugin/builtin.ts` contains official plugin ids and manifests.
- `packages/core/src/plugin/index.ts` exports built-in plugin business data through `./builtin`.
- `packages/ui/src/plugin/plugin-provider.tsx` imports `builtinPluginManifests`, default enabled ids, built-in command handlers, and SEO diagnostics handlers.
- `packages/ui/src/plugin/extension-outlet.tsx` hardcodes `builtin.*` renderer keys to React components.
- `packages/ui/src/plugin/renderers/*`, `packages/ui/src/plugin/diagnostics/*`, and `packages/ui/src/plugin/draft-coach/*` contain official plugin implementation code.
- `packages/web/src/routes/api/plugin/fetch.ts` and `packages/desktop/src/main/plugin-http-proxy.ts` use `builtinPluginManifests` for network permission checks.

The redesign removes these special cases instead of wrapping them with a second third-party path.

## 3. Architecture

### 3.1 High-Level Flow

```text
Web/Desktop bootstrap
  -> PluginSourceResolver[]
  -> PluginCatalog
  -> PluginHost
  -> PluginManager + registries + permission APIs
  -> UI outlets and platform APIs
```

The host application assembles plugin sources. Each source discovers plugin packages and returns plugin definitions. The catalog validates and deduplicates them. The host activates enabled plugins and registers their contributions into the existing registries.

`@hexo-cms/core` owns the protocol and runtime contracts. It does not import any official plugin.

### 3.2 Package Boundaries

```text
packages/core
  plugin/
    define-plugin.ts
    plugin-catalog.ts
    plugin-host.ts
    source-resolver.ts
    manifest.ts
    permissions.ts
    plugin-manager.ts
    extension-registry.ts
    command-registry.ts
    diagnostics-registry.ts
    event-bus.ts
    plugin-storage.ts
    plugin-secret.ts
    plugin-http.ts
    plugin-logger.ts

packages/ui
  plugin/
    plugin-provider.tsx
    extension-outlet.tsx
    plugin-settings.tsx
    plugin-error-boundary.tsx
    platform adapters

packages/plugins
  official.ts
  attachments-helper/
  comments-overview/
  seo-inspector/
  draft-coach/

packages/web
  creates Web PluginHost with official + local-dev sources

packages/desktop
  creates Desktop PluginHost with official + local-dev sources
```

`pnpm-workspace.yaml` must include plugin package paths. The current `packages/*` pattern does not include nested package directories such as `packages/plugins/attachments-helper`; the workspace must add a pattern like `packages/plugins/*`.

## 4. Plugin Package Model

Each plugin is a package that exports one plugin definition.

```text
packages/plugins/attachments-helper/
  package.json
  src/
    plugin.ts
    manifest.ts
    widgets/
    commands/
    diagnostics/
    events/
    index.ts
```

Example shape:

```ts
export default definePlugin({
  manifest,
  widgets: {
    "attachments.summary": AttachmentsSummaryWidget,
  },
  commands: {
    "attachments.copyLink": copyAttachmentLink,
  },
  diagnostics: {},
  events: {},
});
```

### 4.1 Manifest

The manifest remains the declarative source of truth:

- `id`
- `name`
- `version`
- `description`
- `origin`
- `runtime`
- `engine`
- `activation`
- `permissions`
- `network.allowedHosts`
- `contributes`

`source: "builtin"` is removed. The new origin field is:

```ts
type PluginOrigin = "official" | "local-dev" | "private" | "marketplace";
```

The first implementation supports only:

- `official`
- `local-dev`

Future values are part of the public model but not active installation paths.

### 4.2 Runtime

```ts
type PluginRuntime = "hosted" | "worker" | "iframe";
```

The first implementation only runs `hosted`.

Future sandbox support must be added as a `PluginRuntimeAdapter`, not as a separate plugin system.

### 4.3 Runtime Contributions

The plugin module provides runtime objects that cannot live in plain JSON:

- dashboard widget renderers
- command handlers
- diagnostics handlers
- event handlers

The manifest declares that a contribution exists. The plugin definition provides the implementation.

Renderer keys are local to the plugin. For example, a manifest uses `renderer: "attachments.summary"`. The host registers it internally as a globally unique key, such as:

```text
hexo-cms-attachments-helper:attachments.summary
```

No new plugin should use `builtin.*` renderer keys.

## 5. Core Platform Design

### 5.1 `definePlugin`

`definePlugin` is a typed helper exported by `@hexo-cms/core`.

Responsibilities:

- preserve strong TypeScript inference for plugin definitions
- bind a manifest to runtime contributions
- perform shallow structural checks in development
- avoid importing React or UI implementation details into core types beyond generic renderer contracts

### 5.2 `PluginSourceResolver`

A source resolver discovers plugin definitions.

```ts
interface PluginSourceResolver {
  readonly origin: PluginOrigin;
  discover(): Promise<PluginDefinition[]>;
}
```

Initial resolvers:

- `OfficialPluginSource`: imports workspace official plugin packages.
- `LocalDevPluginSource`: loads configured local development plugins in dev mode only.

The catalog does not care whether a plugin came from official packages, local folders, or future marketplace metadata.

### 5.3 `PluginCatalog`

`PluginCatalog` validates and indexes discovered plugins.

Responsibilities:

- validate manifests
- reject duplicate plugin ids
- reject unsupported origins or runtimes
- reject incompatible engine ranges
- expose manifest lookup for platform services such as network proxy
- expose plugin definitions for host activation

Manifest validation should become stricter than the current lightweight validator. Zod is acceptable if the team wants stronger runtime errors, but the design does not require it.

### 5.4 `PluginHost`

`PluginHost` owns activation and runtime registration.

Responsibilities:

- build `PluginManager` from catalog output
- inject platform adapters: state, config, storage, secrets, logs, fetch, data provider
- register widget renderers, commands, diagnostics, and events from enabled plugin definitions
- unregister all contributions when a plugin is disabled or tripped by error threshold
- expose a stable snapshot to UI
- expose manifest lookup to Web/Desktop network proxies

`PluginManager` can remain responsible for state transitions, permission checks, extension registry, command registry, diagnostics registry, event bus, logging, and error threshold behavior. The new host layer is responsible for loading plugin definitions and binding runtime contribution implementations.

## 6. UI Host Design

`@hexo-cms/ui` should be a plugin host UI, not an official plugin container.

Changes:

- `PluginProvider` receives a `PluginHost` or host factory instead of importing official manifests.
- `PluginProvider` no longer hardcodes default official plugins, command handlers, or diagnostics handlers.
- `DashboardExtensionOutlet` resolves renderers from the host registry.
- `PluginSettingsPanel` continues to render manifest-driven settings schema.
- `PluginErrorBoundary` continues to isolate contribution failures and report them to the host.

Official plugin React components move from `packages/ui/src/plugin` into their plugin packages.

Shared UI primitives remain in `@hexo-cms/ui`. Plugin packages can depend on them.

## 7. Web And Desktop Host Design

Web and Desktop are responsible for assembling platform-specific plugin hosts.

### 7.1 Web

Web bootstrap creates a host with:

- official plugin source
- dev-only local plugin source
- Web state/config/storage/log/secret adapters
- Web network fetch proxy
- Web data provider

The `/api/plugin/fetch` route must query plugin manifest data from the host/catalog manifest registry. It must not import a static built-in manifest list.

### 7.2 Desktop

Desktop bootstrap creates a host with:

- official plugin source
- dev-only local plugin source
- Desktop state/config/storage/log/secret adapters
- Desktop IPC network proxy
- Desktop data provider

`createPluginHttpProxy` should receive manifests from the catalog/host. Its default must not be the old built-in manifest list.

## 8. Local Development Plugins

Local development plugins are part of the same plugin model.

Rules:

- enabled only in development mode
- discovered from configured local paths or workspace packages
- validated through the same manifest schema
- loaded through the same host registration flow
- subject to the same permission and network policies
- shown in Settings with `origin: "local-dev"`

The first implementation does not need production installation UX.

## 9. Security Model

### 9.1 Phase 1: Hosted Runtime

Official and local-dev plugins run as trusted hosted ESM modules.

Security still depends on the capability APIs:

- no direct token access
- no raw filesystem API
- no shell
- no raw Electron IPC
- network through proxy only
- secrets through scoped secret API only
- plugin storage scoped by plugin id
- content access through permission-checked content APIs

### 9.2 Phase 2: Sandboxed Runtimes

Future third-party plugin support adds runtime adapters:

- `worker` for commands, diagnostics, and events without complex UI
- `iframe` for complex third-party UI

The external host protocol remains the same. Only the runtime adapter changes.

## 10. One-Time Refactor Strategy

There is no migration requirement because the product has not shipped.

Therefore:

- delete `builtinPluginManifests`
- delete `packages/core/src/plugin/builtin.ts`
- remove `source: "builtin"`
- introduce `origin`
- remove `builtin.*` renderer keys
- move official plugin implementation code to `packages/plugins/*`
- update all tests directly to the new model
- clear development plugin state if needed
- do not create deprecated re-exports
- do not keep old API compatibility tests

This is intentionally a clean break.

## 11. Error Handling

- Manifest validation failure: reject the plugin from the catalog and report plugin id, origin, and source path/package.
- Duplicate plugin id: reject catalog creation.
- Unsupported origin/runtime: mark the plugin invalid before activation.
- Engine incompatibility: mark plugin as `incompatible`; Settings shows the reason and disables the enable action.
- Permission failure: reject the API call with operation name and missing permission.
- Renderer failure: isolate with `PluginErrorBoundary`, record plugin error, and preserve the host page.
- Command/diagnostics/event failure: record plugin error and apply existing error threshold behavior.
- Local-dev load failure: show source path and stack in development diagnostics.
- Network proxy rejection: return a policy error and write audit log with plugin id, URL, method, and reason.

## 12. Testing Strategy

### Core Tests

- manifest validation with `origin` and `runtime`
- duplicate plugin id rejection
- unsupported runtime rejection
- catalog discovery and indexing
- permission broker behavior
- extension registration and cleanup
- command, diagnostics, event registration from plugin definitions
- plugin error threshold behavior

### Official Plugin Tests

Each official plugin package should test:

- manifest validity
- declared contribution keys match runtime contribution keys
- command handlers
- diagnostics handlers
- event handlers
- widget smoke rendering where applicable

### Host Integration Tests

- official plugin discovery
- dev-only local plugin discovery
- enable/disable behavior
- snapshot output
- renderer resolution
- network proxy manifest lookup
- plugin settings schema rendering

### UI Tests

- Settings lists plugin origin and runtime
- Dashboard renders host-provided plugin widgets
- missing renderer shows a controlled error
- contribution error boundary isolates failures
- command execution routes through host

## 13. Acceptance Criteria

- `@hexo-cms/core` contains no official plugin business code.
- Runtime code no longer imports `builtinPluginManifests`.
- Official plugins live under independent plugin packages.
- Official plugins and local-dev plugins enter through the same discovery, catalog, host, manager, permission, and registry flow.
- `@hexo-cms/ui` does not hardcode official plugin renderer or command mappings.
- Web and Desktop network proxies use catalog/host manifest lookup.
- Current official plugins are functional after the refactor:
  - Attachments Helper
  - Comments Overview
  - SEO Inspector
  - Draft Coach
- Tests cover official plugin packages and the unified host path.
