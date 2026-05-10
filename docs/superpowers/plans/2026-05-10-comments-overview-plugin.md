# Comments Overview Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Comments Overview as the second trusted built-in plugin, proving multiple built-in manifests, dashboard renderer mapping, plugin settings metadata, and enable/disable behavior.

**Architecture:** Reuse the v0.1 plugin architecture in `packages/core/src/plugin` and `packages/ui/src/plugin`. Keep the plugin trusted and declarative: manifest contributions live in core, UI renderer lives in `packages/ui/src/plugin/renderers`, and settings remain schema metadata until the v0.2 schema renderer lands.

**Tech Stack:** TypeScript, React 19, Vitest, Testing Library, existing DataProvider and PluginManager APIs.

---

## Current Baseline

v0.1 already provides:

1. `builtinPluginManifests` with Attachments Helper.
2. `PluginManager` enable/disable and extension rebuild.
3. Dashboard widget outlet with renderer key mapping.
4. Settings plugin management panel.
5. Dashboard layout picker support for plugin widgets.

This plan intentionally does not add Secret Store, network fetch, or third-party API calls. Comments Overview uses static/sample comment summary data first so the plugin architecture can evolve without API key handling.

## File Structure

- Modify: `packages/core/src/plugin/builtin.ts`
  - Add `COMMENTS_OVERVIEW_PLUGIN_ID`.
  - Add Comments Overview manifest with dashboard widget, settings panel, sidebar item, and command contribution.
- Modify: `packages/core/src/__tests__/plugin.test.ts`
  - Verify two built-in manifests validate.
  - Verify enabling/disabling Comments Overview adds/removes its dashboard widget.
- Create: `packages/ui/src/plugin/renderers/comments-overview-widget.tsx`
  - Render pending/approved/spam summary and an action link to `/comments`.
- Modify: `packages/ui/src/plugin/extension-outlet.tsx`
  - Map `builtin.comments.overview` to `CommentsOverviewWidget`.
- Modify: `packages/ui/src/__tests__/plugin-ui.test.tsx`
  - Verify Comments Overview appears in plugin settings and dashboard renderer output.

---

### Task 1: Add Comments Overview Manifest

**Files:**
- Modify: `packages/core/src/plugin/builtin.ts`
- Test: `packages/core/src/__tests__/plugin.test.ts`

- [ ] **Step 1: Write the failing manifest test**

Add `COMMENTS_OVERVIEW_PLUGIN_ID` to the import from `../plugin`, then add this test to `packages/core/src/__tests__/plugin.test.ts`:

```ts
import {
  COMMENTS_OVERVIEW_PLUGIN_ID,
} from "../plugin";

it("registers comments overview as a second built-in plugin", () => {
  expect(builtinPluginManifests.map((manifest) => manifest.id)).toContain(COMMENTS_OVERVIEW_PLUGIN_ID);

  const manager = new PluginManager({
    manifests: builtinPluginManifests,
    store: new MemoryPluginStateStore(),
  });

  manager.enable(COMMENTS_OVERVIEW_PLUGIN_ID);

  expect(manager.snapshot().extensions.dashboardWidgets).toEqual([
    expect.objectContaining({
      pluginId: COMMENTS_OVERVIEW_PLUGIN_ID,
      renderer: "builtin.comments.overview",
      title: "评论概览",
    }),
  ]);

  manager.disable(COMMENTS_OVERVIEW_PLUGIN_ID);
  expect(manager.snapshot().extensions.dashboardWidgets).toHaveLength(0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @hexo-cms/core test -- plugin.test.ts
```

Expected: FAIL because `COMMENTS_OVERVIEW_PLUGIN_ID` is not exported and the manifest does not exist.

- [ ] **Step 3: Add the manifest**

Add this export near `ATTACHMENTS_HELPER_PLUGIN_ID`, then insert the manifest object as the second item in `builtinPluginManifests`:

```ts
export const COMMENTS_OVERVIEW_PLUGIN_ID = "hexo-cms-comments-overview";

{
  id: COMMENTS_OVERVIEW_PLUGIN_ID,
  name: "Comments Overview",
  version: "0.1.0",
  description: "汇总评论状态，并在仪表板展示待处理评论入口。",
  source: "builtin",
  engine: {
    hexoCms: ">=0.1.0",
  },
  activation: ["onDashboard"],
  permissions: ["ui.contribute", "pluginConfig.write", "command.register"],
  contributes: {
    dashboardWidgets: [
      {
        id: "comments.overview",
        title: "评论概览",
        renderer: "builtin.comments.overview",
        size: "medium",
        order: 90,
      },
    ],
    settingsPanels: [
      {
        id: "comments.settings",
        title: "评论概览",
        schema: "comments.settings",
      },
    ],
    sidebarItems: [
      {
        id: "comments.entry",
        title: "评论概览",
        target: "plugin.settings",
      },
    ],
    commands: [
      {
        id: "comments.openModeration",
        title: "打开评论管理",
      },
    ],
  },
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --filter @hexo-cms/core test -- plugin.test.ts
```

Expected: PASS.

---

### Task 2: Add Comments Overview Dashboard Renderer

**Files:**
- Create: `packages/ui/src/plugin/renderers/comments-overview-widget.tsx`
- Modify: `packages/ui/src/plugin/extension-outlet.tsx`
- Test: `packages/ui/src/__tests__/plugin-ui.test.tsx`

- [ ] **Step 1: Write the failing UI renderer test**

Add this test to `packages/ui/src/__tests__/plugin-ui.test.tsx`:

```tsx
import { DashboardExtensionOutlet } from "../plugin";
import { COMMENTS_OVERVIEW_PLUGIN_ID } from "@hexo-cms/core";

it("renders the comments overview dashboard widget", () => {
  const widgets = [
    {
      pluginId: COMMENTS_OVERVIEW_PLUGIN_ID,
      pluginName: "Comments Overview",
      id: "comments.overview",
      title: "评论概览",
      renderer: "builtin.comments.overview",
      size: "medium" as const,
      order: 90,
    },
  ];

  renderWithProviders(<>{DashboardExtensionOutlet({ widgets }).map((widget) => widget.content)}</>);

  expect(screen.getByText("待审核")).toBeInTheDocument();
  expect(screen.getByText("打开评论管理")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
pnpm --filter @hexo-cms/ui test -- plugin-ui.test.tsx
```

Expected: FAIL because `builtin.comments.overview` has no renderer.

- [ ] **Step 3: Create the renderer**

Create `packages/ui/src/plugin/renderers/comments-overview-widget.tsx`:

```tsx
import type { ComponentType } from "react";
import { AlertTriangle, CheckCircle2, MessageSquare, ShieldAlert } from "lucide-react";
import { Button } from "../../components/ui/button";

const summary = {
  total: 6,
  pending: 2,
  approved: 3,
  spam: 1,
};

export function CommentsOverviewWidget() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <SummaryTile icon={AlertTriangle} label="待审核" value={summary.pending} tone="warning" />
        <SummaryTile icon={CheckCircle2} label="已通过" value={summary.approved} tone="success" />
        <SummaryTile icon={ShieldAlert} label="垃圾" value={summary.spam} tone="error" />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-[var(--border-default)] bg-[var(--bg-muted)] p-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)]">评论管理</div>
          <div className="text-xs text-[var(--text-secondary)]">共 {summary.total} 条示例评论</div>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/comments">
            <MessageSquare size={14} />
            打开评论管理
          </a>
        </Button>
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  tone: "warning" | "success" | "error";
}) {
  const toneClass = {
    warning: "text-[var(--status-warning)] bg-[var(--status-warning-bg)]",
    success: "text-[var(--status-success)] bg-[var(--status-success-bg)]",
    error: "text-[var(--status-error)] bg-[var(--status-error-bg)]",
  }[tone];

  return (
    <div className={`rounded-lg p-3 ${toneClass}`}>
      <Icon size={15} className="mb-2" />
      <div className="text-lg font-semibold leading-none">{value}</div>
      <div className="mt-1 text-xs">{label}</div>
    </div>
  );
}
```

- [ ] **Step 4: Register the renderer**

Update `packages/ui/src/plugin/extension-outlet.tsx`:

```tsx
import { CommentsOverviewWidget } from "./renderers/comments-overview-widget";

function PluginRenderer({ widget }: { widget: RegisteredDashboardWidget }) {
  switch (widget.renderer) {
    case "builtin.attachments.summary":
      return <AttachmentsSummaryWidget />;
    case "builtin.comments.overview":
      return <CommentsOverviewWidget />;
    default:
      return (
        <div className="rounded-lg border border-[var(--status-warning)] bg-[var(--status-warning-bg)] p-3 text-sm text-[var(--status-warning)]">
          未找到插件渲染器: {widget.renderer}
        </div>
      );
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
pnpm --filter @hexo-cms/ui test -- plugin-ui.test.tsx
```

Expected: PASS.

---

### Task 3: Verify Settings Management With Two Plugins

**Files:**
- Modify: `packages/ui/src/__tests__/plugin-ui.test.tsx`

- [ ] **Step 1: Write the failing settings test**

Add this test to `packages/ui/src/__tests__/plugin-ui.test.tsx`:

```tsx
it("can disable only Comments Overview while keeping Attachments Helper enabled", async () => {
  const user = userEvent.setup();
  renderWithProviders(<PluginSettingsPanel />);

  expect(screen.getByText("Attachments Helper")).toBeInTheDocument();
  expect(screen.getByText("Comments Overview")).toBeInTheDocument();

  const commentsCard = screen.getByText("Comments Overview").closest(".rounded-xl");
  expect(commentsCard).not.toBeNull();

  await user.click(within(commentsCard as HTMLElement).getByRole("button", { name: "停用" }));

  expect(within(commentsCard as HTMLElement).getByText("未启用")).toBeInTheDocument();
  expect(screen.getByText("Attachments Helper")).toBeInTheDocument();
});
```

Also import `within`:

```ts
import { render, screen, waitFor, within } from "@testing-library/react";
```

- [ ] **Step 2: Run the test to verify it fails if the manifest is not wired**

Run:

```bash
pnpm --filter @hexo-cms/ui test -- plugin-ui.test.tsx
```

Expected before Task 1/2 implementation: FAIL because Comments Overview is absent. Expected after Task 1/2: PASS.

- [ ] **Step 3: Keep implementation minimal**

No production code is needed if Task 1 made Comments Overview part of `builtinPluginManifests`. `PluginSettingsPanel` maps over `snapshot.plugins`, so it should show both plugins automatically.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm --filter @hexo-cms/ui test -- plugin-ui.test.tsx
```

Expected: PASS.

---

### Task 4: Full Verification

**Files:**
- No production files unless prior tasks reveal failures.

- [ ] **Step 1: Run core tests**

Run:

```bash
pnpm --filter @hexo-cms/core test
```

Expected: all core tests pass.

- [ ] **Step 2: Run UI tests**

Run:

```bash
pnpm --filter @hexo-cms/ui test
```

Expected: all UI tests pass.

- [ ] **Step 3: Run type-check**

Run:

```bash
pnpm type-check
```

Expected: exit code 0.

- [ ] **Step 4: Run builds**

Run:

```bash
pnpm build
pnpm --filter @hexo-cms/desktop exec electron-vite build
```

Expected: both commands exit 0. Existing Vite chunk-size warnings are acceptable unless a new error appears.

---

## Self-Review

Spec coverage:

1. Multiple built-in manifests: Task 1.
2. Dashboard renderer mapping: Task 2.
3. Settings enable/disable behavior: Task 3.
4. No Secret Store/network dependency: enforced by manifest permissions in Task 1.
5. Verification: Task 4.

Placeholder scan: no unresolved placeholders remain.

Type consistency:

1. Plugin id is `COMMENTS_OVERVIEW_PLUGIN_ID`.
2. Renderer key is `builtin.comments.overview`.
3. Widget id is `comments.overview`.
