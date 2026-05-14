# Auto-Update Feature Design

**Date:** 2026-05-14
**Status:** Approved

---

## Overview

Add automatic update capability to the Hexo CMS Electron desktop app using `electron-updater`, backed by GitHub Releases. Users are notified of new versions on startup, can manually trigger checks, and can switch between stable/beta update channels.

### Decisions Summary

| Decision | Choice |
|----------|--------|
| Update strategy | Auto-check on startup + manual trigger in settings |
| Update channels | Stable (GitHub Release) + Beta (GitHub pre-release) |
| GitHub config | Environment variables (`GITHUB_REPOSITORY`) |
| Code signing | Skipped (dev/self-use only) |
| Auto-download | Off — user must confirm before downloading |
| Release type | Draft (manual review before publishing) |

---

## Architecture

```
Main Process                          Renderer Process
+-------------------------+           +--------------------------+
|  auto-updater.ts        |           |  useUpdater hook         |
|  +- init(channel)       |   IPC     |  +- status, progress     |
|  +- checkForUpdates()   |<--------->|  +- checkForUpdates()    |
|  +- downloadUpdate()    |           |  +- downloadUpdate()     |
|  +- quitAndInstall()    |           |  +- quitAndInstall()     |
|           |              |           |            |              |
|           v              |           |     +------+------+      |
|  electron-updater        |           |     v             v      |
|  (GitHub Releases)       |           |  UpdateBanner   Settings |
+-------------------------+           |  (global bar)  (section) |
                                      +--------------------------+
```

**Data flow:**
1. Main process `auto-updater` wraps `electron-updater`, listens to its events
2. Update events (checking/available/progress/downloaded/error) are pushed via main→renderer IPC
3. User actions (check/download/install) call renderer→main IPC
4. Renderer `useUpdater` hook aggregates state, drives `UpdateBanner` and Settings UI

---

## Files

### New

| File | Purpose |
|------|---------|
| `packages/desktop/src/main/auto-updater.ts` | Update service: wraps electron-updater, emits IPC events |
| `packages/desktop/src/renderer/src/hooks/useUpdater.ts` | React hook: aggregates update state from IPC pushes |
| `packages/desktop/src/renderer/src/components/UpdateBanner.tsx` | Global notification bar for update status |
| `.github/workflows/release.yml` | CI workflow: build + publish to GitHub Releases |
| `packages/desktop/src/main/__tests__/auto-updater.test.ts` | Unit tests for auto-updater module |

### Modified

| File | Change |
|------|--------|
| `packages/desktop/src/main/index.ts` | Register 5 new IPC handlers; call `initUpdater()` on app ready |
| `packages/desktop/src/preload/index.ts` | Expose 5 new electronAPI methods + `onUpdateStatus` listener |
| `packages/desktop/electron-builder.yml` | Fix publish config (env-based owner/repo), add `releaseType: draft` |
| `packages/ui/src/types/electron-api.ts` | Add 5 update channels to `ELECTRON_IPC_CHANNELS` + `ElectronAPI` type |
| `packages/desktop/src/renderer/src/routes/settings.tsx` | Add update section (version, channel, check button, progress) |
| `packages/desktop/src/renderer/src/routes/__root.tsx` | Render `UpdateBanner` above CMSLayout |
| `packages/desktop/src/preload/__tests__/ipc-channel-contract.test.ts` | Assert new channels have handlers |

---

## Main Process

### `auto-updater.ts`

```ts
// Key behaviors:
// - autoDownload: false — notify user first, download on demand
// - allowPrerelease — toggled by channel (stable/beta)
// - All events forwarded via webContents.send('update:status', payload)
// - Channel preference persisted to userData/github-config.json
```

**Events → IPC payloads:**

| electron-updater event | IPC payload |
|------------------------|-------------|
| `checking-for-update` | `{ status: 'checking' }` |
| `update-available` | `{ status: 'available', version, releaseDate }` |
| `update-not-available` | `{ status: 'up-to-date' }` |
| `download-progress` | `{ status: 'downloading', percent, bytesPerSecond }` |
| `update-downloaded` | `{ status: 'downloaded', version }` |
| `error` | `{ status: 'error', message }` |

**Public API:**

| Method | Action |
|--------|--------|
| `init(mainWindow, channel)` | Configure updater, bind window for IPC sends |
| `checkForUpdates()` | `autoUpdater.checkForUpdates()` |
| `downloadUpdate()` | `autoUpdater.downloadUpdate()` |
| `quitAndInstall()` | `autoUpdater.quitAndInstall()` |
| `setChannel(channel)` | Toggle `allowPrerelease`, persist preference |

### IPC Handlers (in `index.ts`)

| Channel | Direction | Handler |
|---------|-----------|---------|
| `update:check` | invoke | `updater.checkForUpdates()` |
| `update:download` | invoke | `updater.downloadUpdate()` |
| `update:install` | invoke | `updater.quitAndInstall()` |
| `update:set-channel` | invoke | `updater.setChannel(channel)` |
| `update:get-version` | invoke | Returns `app.getVersion()` + `channel` |

**Startup flow:** After `BrowserWindow` is ready:
1. Read channel preference from `github-config.json` (default `stable`)
2. `updater.init(mainWindow, channel)`
3. `updater.checkForUpdates()` — silent, failures swallowed

---

## Preload Bridge

```ts
// Added to contextBridge.exposeInMainWorld('electronAPI', { ... })
onUpdateStatus: (callback: (payload: UpdateStatusPayload) => void) => {
  ipcRenderer.on('update:status', (_event, payload) => callback(payload));
  return () => ipcRenderer.removeAllListeners('update:status');
},
checkForUpdates: () => ipcRenderer.invoke('update:check'),
downloadUpdate: () => ipcRenderer.invoke('update:download'),
quitAndInstall: () => ipcRenderer.invoke('update:install'),
setUpdateChannel: (channel: UpdateChannel) => ipcRenderer.invoke('update:set-channel', channel),
getVersion: () => ipcRenderer.invoke('update:get-version'),
```

---

## Renderer UI

### `useUpdater` Hook

```ts
interface UseUpdaterReturn {
  status: 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'downloaded' | 'error';
  progress: number;           // 0–100
  version: string | null;     // New version string
  error: string | null;
  channel: 'stable' | 'beta';
  currentVersion: string;
  checkForUpdates: () => void;
  downloadUpdate: () => void;
  quitAndInstall: () => void;
  setChannel: (ch: UpdateChannel) => void;
}
```

- Listens to `electronAPI.onUpdateStatus()` on mount, updates state reactively
- Calls `electronAPI.getVersion()` to populate `currentVersion` + `channel`
- Cleanup on unmount

### `UpdateBanner` Component

Fixed bar at top of the app, above CMSLayout, rendered in `__root.tsx`.

| `status` | Rendered |
|----------|----------|
| `checking` | "Checking for updates..." with spinner |
| `available` | "New version vX.Y.Z available" + [Update Now] button |
| `downloading` | "Downloading vX.Y.Z · 45%" with progress bar |
| `downloaded` | "vX.Y.Z ready to install" + [Restart Now] button |
| `error` | "Update failed: ..." + [Retry] button |
| `idle` / `up-to-date` | Hidden |

- Styled with Tailwind CSS v4, uses `--brand-primary` for accent
- Position: fixed top, full width, z-50

### Settings Page Updates

New "Updates" section appended to existing settings route:

```
---
Version Information
  Current version: v0.0.1
  Update channel:  [Stable ▼] / [Beta ▼]
  [Check for Updates] button
  Status: "Up to date" / "v1.2.0 available" / progress
```

- Channel dropdown calls `setChannel()` which triggers a re-check
- Button shows spinner when status is `checking` or `downloading`

---

## CI/CD: Release Workflow

### `.github/workflows/release.yml`

**Triggers:**
1. Push of `v*` tag → creates full release (prerelease: false if tag is semver, prerelease if tag contains `beta`/`alpha`)
2. `workflow_dispatch` → manual, inputs: `version` (string), `prerelease` (boolean)

**Single job `release` on `ubuntu-latest`:**

```yaml
steps:
  1. checkout
  2. setup pnpm + Node 22
  3. pnpm install --frozen-lockfile
  4. pnpm build:desktop:compile      # electron-vite build only
  5. electron-builder --publish always
     env:
       GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       GITHUB_REPOSITORY: ${{ github.repository }}
       CSC_IDENTITY_AUTO_DISCOVERY: false   # skip code signing
```

**Note:** Builds only Linux AppImage on `ubuntu-latest`. macOS/Windows builds require their respective runners (future enhancement once signing is configured).

### `electron-builder.yml` Changes

```yaml
publish:
  provider: github
  owner: bijinfeng
  repo: hexo-cms
  releaseType: draft
```

`releaseType: draft` ensures each release starts as a draft — manual review before publishing to users.

### `packages/desktop/package.json` Changes

Add `repository` field so electron-builder can infer the GitHub repo automatically:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/bijinfeng/hexo-cms.git"
}
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No network on startup check | Fails silently, no notification shown |
| Download interrupted | electron-updater resumes; UI shows error with retry |
| App closed during download | Download aborts; re-checks on next launch |
| Channel switch downgrades version | Clears cache, re-checks; warns "will install version X" |
| First launch (no channel preference) | Defaults to `stable`, writes to `github-config.json` |
| GitHub API rate limit | electron-updater caches 3 hours between checks |
| Release missing current platform artifact | electron-updater returns `update-not-available` |

---

## Testing

| Level | What | How |
|-------|------|-----|
| IPC contract | New channels registered | Extend `ipc-channel-contract.test.ts` |
| Unit | auto-updater event dispatch | Mock `electron-updater`, assert IPC sends |
| Hook | useUpdater state transitions | Simulate `update:status` pushes, assert state |
| CI smoke | Build succeeds end-to-end | `electron-builder --publish never` in release workflow |

---

## Files Changed Summary

| Category | New | Modified |
|----------|-----|----------|
| Main process | `auto-updater.ts` | `index.ts` |
| Preload | — | `index.ts` |
| Renderer | `useUpdater.ts`, `UpdateBanner.tsx` | `settings.tsx`, `__root.tsx` |
| Types/contract | — | `electron-api.ts` |
| Build config | — | `electron-builder.yml`, `package.json` |
| CI/CD | `release.yml` | — |
| Tests | `auto-updater.test.ts` | `ipc-channel-contract.test.ts` |
