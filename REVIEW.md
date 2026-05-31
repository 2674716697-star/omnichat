# Automated Review Guardrails

每次修改代码后，**必须在提交前**执行完整审核流程。

## 快速执行（推荐）

```bash
node _safe_check.mjs
```

等价于手动执行：

```bash
node _review.mjs
node _check_stability.mjs
node _build.js
node _check_stability.mjs
node _review.mjs
git status --short
```

任意一步失败即停止，通过后显示 `SAFE CHECK PASSED`。

## 手动执行顺序

```bash
node _review.mjs
node _check_stability.mjs
node _build.js
node _check_stability.mjs
node _review.mjs
git status --short
```

## 失败处理

如果任何一步失败：

1. **不允许提交**
2. 先修复失败项
3. 重新执行完整流程
4. 全部通过后再提交

## 检查清单

### `_review.mjs` 检查项目

| 类别 | 检查项 |
|------|--------|
| 基础文件 | script.js, style.css, index.html, omnichat.html, _check_stability.mjs, sw.js |
| 依赖卫生 | 禁止 package.json, package-lock.json |
| 底部 UI 禁区 | 禁止 scene-immersive 覆盖 .bottom-bar, .quick-actions, .btn-quick, .input-row, .input-message |
| Splash 完整性 | is-splashing class, z-index 99999, ::after 延伸, bottom-bar 隐藏, body 背景锁定 |
| 底部 UI 全局 | bottom-bar 样式, 动态高度, input-message 样式 |
| Migration 完整性 | STORAGE_SCHEMA_VERSION, normalizeConversation/Message, displayContent/_requestContent fallback |
| A/B/C/D 逻辑 | parseSceneChoiceInput, parseDirectionOptions, isLatestInteractiveDirectionMessage, chip click sendMessageContent, msgIndex 传递, fail-closed |
| Build 版本 | build-version meta, \_\_BUILD\_VERSION\_\_ |
| Service Worker | CACHE_NAME omnichat-v3 |
| 安全 | 禁止 security-pull, security-panel |
| Git 清洁度 | 禁止未知临时文件（CLAUDE.md 除外） |

### `_check_stability.mjs` 检查项目

- 禁止底部选择器
- 包卫生
- 安全 artifacts
- Service Worker
- Build version
- Splash
- 全局底部 UI
- 稳定性特性
- Migration 完整性

## 禁区规则

以下区域不允许修改，除非显式要求：

- bottom-bar 结构和样式
- splash 逻辑和样式
- PWA / service worker 缓存版本
- STORAGE_SCHEMA_VERSION（必须同步更新 migration）
- 数据结构变更（必须同步 normalize* 函数）
- package.json / node_modules

## 提交示例

```bash
# 仅 JS + build
git add script.js omnichat.html
git commit -m "fix: description"

# JS + CSS + build
git add script.js style.css omnichat.html
git commit -m "fix: description"
```
