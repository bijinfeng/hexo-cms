# 客户端发版指南

## 概述

Hexo CMS 桌面客户端通过 GitHub Actions 自动构建，发布到 GitHub Releases，用户通过内置的 `electron-updater` 自动获取更新。

## 发版步骤

### 1. 确保代码已合并到 master

所有要发布的改动应已合并到 `master` 分支，且 CI 检查全部通过：

```bash
git checkout master
git pull
pnpm type-check && pnpm lint && pnpm test
```

### 2. 更新版本号

修改 `packages/desktop/package.json` 中的 `version` 字段：

```json
{
  "version": "0.0.2"
}
```

提交版本号变更：

```bash
git add packages/desktop/package.json
git commit -m "chore: bump version to 0.0.2"
```

### 3. 打 Tag 并推送

Release workflow 由 `v*` 格式的 tag 触发。

**正式版：**
```bash
git tag v0.0.2
git push && git push --tags
```

**预发布版（beta 通道）：**
```bash
git tag v0.0.2-beta.1
git push && git push --tags
```

### 4. GitHub Actions 自动构建

推送 tag 后，`.github/workflows/release.yml` 会自动执行：

1. 检出代码
2. 安装依赖
3. 构建桌面端 (`electron-vite build`)
4. 三端并行打包并发布到 GitHub Releases（ubuntu-latest / windows-latest / macos-latest）

构建产物：
- `Hexo-CMS-{version}.AppImage` (Linux)
- `Hexo-CMS-Setup-{version}.exe` (Windows NSIS 安装包)
- `Hexo-CMS-{version}.dmg` (macOS)

产物会作为 **draft release** 创建，不会立即对用户可见。

### 5. 检查并发布 Draft Release

1. 前往 [GitHub Releases](https://github.com/bijinfeng/hexo-cms/releases)
2. 找到对应的 draft release
3. 检查三端构建产物是否齐全
4. 编辑 release notes，填写更新内容
5. 点击 **Publish release**

> macOS 构建当前未配置代码签名和公证（notarization），用户打开 DMG 时需手动允许。

### 6. 用户端自动更新

发布后，已安装客户端的用户会：

- **启动时自动检查**：应用启动时静默检查新版本
- **顶栏通知**：发现新版本后顶部显示通知条，点击「Update Now」下载
- **设置页手动检查**：用户可在 设置 → 自动更新 中手动点击「检查更新」
- **通道切换**：用户可选择 Stable 或 Beta 更新通道

用户下载完成后点击「Restart Now」即可安装新版本。

## 更新通道说明

| 通道 | 触发条件 | 说明 |
|------|---------|------|
| Stable | 推送 `v*` tag（不含 `-beta`/`-alpha`） | 正式发布，面向所有用户 |
| Beta | 推送含 `-beta` 或 `-alpha` 的 tag | 预发布测试版，仅 Beta 通道用户可见 |

用户在 设置 → 自动更新 → 更新通道 中可切换。

## 注意事项

- 当前未配置代码签名，macOS 用户需手动信任应用
- Release 类型为 draft，务必手动检查后发布
- 推送 tag 前确保版本号和 tag 保持一致
