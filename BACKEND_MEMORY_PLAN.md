# Mira 后端记忆计划

## 当前状态快照（2026-06-15）

- 当前是本地开发快照，未部署生产，未 push。
- 远端记忆是 **Phase 2 minimal contract**：
  - `memory-update` 只写 `conversations` / `story_states` / `memory_facts`。
  - `memory-retrieve` 只读 `conversations`（client_conversation_id → uuid 映射）/ `memory_facts`（按 importance DESC, updated_at DESC，最多 10 条）。
  - 不写/不读 `messages` / `story_chapters`。
  - 不调用辅助模型（无 LLM summarizer），不生成章节摘要。
  - 不使用 pgvector 语义检索。
- Supabase Auth / RLS / Storage 尚未启用；`user_profiles` 只是后端预留表，暂不接前端。
- 远端记忆只影响下一轮缓存记忆（第 N 轮检索结果用于第 N+1 轮），绝不阻塞当前轮的流式回复。
- 模型 API Key 只保存在用户本地浏览器，后端不接收、不存储、不返回。
- `supabase/memory_schema.sql` 是当前完整参考 schema；`supabase/migrations/*.sql` 是按时间戳执行的增量源。新库部署二选一：执行完整 schema 或执行 migrations，不混用到同一个空库。
- 远端 contract 测试默认跳过；只有显式设置 `RUN_REMOTE_MEMORY_CONTRACT=1` 才会写入 `contract-*` 测试数据。

### 2026-06-15 验证结果（Codex review）

| 检查项 | 结果 | 说明 |
|--------|------|------|
| `node --check script.js` | ✅ PASS | 语法有效 |
| `node _check_stability.mjs` | ✅ PASS | secret hygiene + gitignore + tracking 检查通过 |
| `node _check_remote_memory_contract.mjs` | ✅ PASS | 源码契约检查（默认模式，未发网络请求）全部通过 |
| `node _check_release_readiness.mjs` | ⚠️ PASS WITH WARNINGS | 未提交改动按路径分组成功；warning 见下方 |
| `deno check supabase/functions/memory-update/index.ts` | ✅ PASS | TypeScript 类型检查通过 |
| `deno check supabase/functions/memory-retrieve/index.ts` | ✅ PASS | TypeScript 类型检查通过 |
| `git diff --check` | ✅ PASS | 无空白冲突 |
| 远端 contract 写测试 | ⏭️ SKIPPED | `RUN_REMOTE_MEMORY_CONTRACT` 未设置，符合预期 |
| `supabase/.temp` 跟踪检查 | ✅ CLEAN | `git ls-files supabase/.temp` 返回空 |
| migration 时序检查 | ✅ OK | `20260614171000`（grant service_role）不引用 `user_profiles`；`20260614172000`（add_user_profiles）创建并授权 `user_profiles` |

### 剩余 release warning

**Supabase project URL 和 publishable key 默认值在源码中**（`src/01_constants.js` / `script.js` / `omnichat.html` / `index.html`）。这些不是 service-role secret，但公开仓库会永久暴露 project/API entry point。当前阶段（个人/小范围使用）可接受；公开多用户上线前应改为 runtime config 注入或转为私有仓库。

### 下一阶段建议

1. **不要启动 Profile/Auth API** 直到当前未提交改动完成 review 并 commit/split。
2. **下一步二选一**，不要同时做：
   - **路径 A**：commit 拆分 / release 清理（整理当前未提交改动，按功能拆 commit，清理临时文件）。
   - **路径 B**：Profile/Auth 设计（用户认证、JWT 验证、RLS 策略、user_profiles 接前端）。
3. 当前未提交改动较多（`M` + `??` 共 14+ 个文件），建议先走路径 A，避免改动继续堆积。
4. 路径 A 和路径 B 的详细方案见 **[RELEASE_CLEANUP_AND_AUTH_PLAN.md](./RELEASE_CLEANUP_AND_AUTH_PLAN.md)**（commit 拆分计划 + Profile/Auth/RLS/Storage 架构设计）。

## 目标

为 Mira 增加一个可选的后端记忆层，用来提升长剧情稳定性，减少无效 prompt token 消耗，并让手机和电脑之间的使用更方便。

这个计划不要求立刻替换当前前端本地 `storyMemory`。正确路线是先保留本地记忆，把后端作为增强层接入，等稳定后再逐步接管检索、同步和上下文组装。

## 客观判断

当前前端记忆方案适合作为 MVP：

- 不需要账号和服务器。
- 隐私简单，数据在本地。
- 后台运行，不阻塞主回复。
- 能给模型提供章节摘要，已经能改善一部分长对话混乱。

但它有结构性上限：

- 记忆最终还是要作为文本塞进 prompt，记忆越多 token 越容易涨。
- 记忆只存在当前设备，手机和电脑会漂移。
- 模型总结错了以后缺少统一去重、纠错、版本管理。
- 前端不适合长期承担搜索、合并、加密、同步和记忆维护。

后端真正有价值的地方不是“存更多记忆”，而是“每轮只取最相关的少量记忆”。

## 推荐技术路线

### 首选方案：Supabase

适合当前阶段，原因：

- 上手快。
- PostgreSQL 适合结构化存储。
- 后续可以用 `pgvector` 做语义检索。
- 如果以后要账号和跨设备同步，Supabase Auth 和 RLS 可以直接接上。
- 比自己维护完整 Node 后端更省心。

### 备选方案

- Cloudflare Workers + D1/KV：更轻，但向量检索和复杂关系数据会麻烦一点。
- Node/Vercel：自由度高，适合以后做模型代理，但维护成本更高。

客观建议：先用 Supabase 做原型，不急着做完整后端代理。

## 记忆分层

不要把所有记忆做成一个大摘要。应该分层。

### 1. 当前状态

对应现有 `sceneState`。

保存：

- 当前角色
- 当前目标
- 当前场景
- 精神状态
- 身体状态
- 最新剧情走向
- A/B/C/D 选项状态

用途：

- 每轮都应该进入 prompt。
- 它是“现在发生什么”，不是长期历史。

### 2. 章节记忆

对应现有 `storyMemory.chapters`。

保存：

- 章节标题
- 章节摘要
- 关键事件
- 角色变化
- 关系变化
- 未解决线索

用途：

- 保持章节连续性。
- 压缩长对话时提供骨架。

### 3. 长期事实

保存真正长期有效的信息。

例子：

- 世界规则
- 角色身份
- 重要承诺
- 秘密
- 关系事实
- 不可逆事件

用途：

- 通过检索进入 prompt。
- 不应该每轮全部发送。

### 4. 可检索记忆块

把长期事实拆成小块，方便搜索。

每条记忆建议包含：

- conversation id
- chapter id
- 类型
- 内容
- 重要度
- 状态
- 来源消息或来源章节
- 创建时间
- 最后使用时间
- 向量 embedding，后续阶段再加

## 数据库表设计

### conversations

会话表。

字段建议：

- `id`
- `user_id`
- `title`
- `provider`
- `model`
- `settings_json`
- `created_at`
- `updated_at`
- `archived`

### messages

消息表。

字段建议：

- `id`
- `conversation_id`
- `role`
- `content`
- `display_content`
- `request_content`
- `metadata_json`
- `created_at`

注意：

- 不要保存每个 streaming delta。
- 只保存最终完整消息。

### story_states

当前故事状态表。

字段建议：

- `conversation_id`
- `scene_state_json`
- `world_json`
- `character_json`
- `status_json`
- `npcs_json`
- `updated_at`

### story_chapters

章节记忆表。

字段建议：

- `id`
- `conversation_id`
- `chapter_index`
- `turn_start`
- `turn_end`
- `title`
- `summary`
- `key_events_json`
- `character_changes_json`
- `relationship_changes_json`
- `unresolved_threads_json`
- `created_at`

### user_profiles

用户资料表（后端预留，未接前端）。

字段建议：

- `user_id` — uuid PK，未来对应 `auth.users.id`；当前不强制 FK
- `display_name` — 展示名
- `bio` — 个人简介
- `avatar_url` — 头像 URL（未来可接 Supabase Storage 或外链）
- `profile_background_url` — 个人资料背景 URL
- `profile_background_position` — 背景 CSS position
- `profile_theme_json` — 主题偏好
- `personalization_json` — 长期个性化空间（写作偏好、用户称呼、阅读偏好、默认角色偏好；不存敏感密钥）
- `preferences_json` — 通用偏好
- `public_profile_json` — 对外可见的资料扩展（如自定义标签、社交链接、展示徽章；不存私密信息）
- `private_profile_json` — 仅自己可见的资料扩展（如生日、时区、语言偏好；**不存密钥**）
- `ui_state_json` — 前端 UI 状态持久化（如侧栏折叠、最后使用的标签页、面板宽度）
- `asset_settings_json` — 资产呈现参数（如头像裁剪坐标、背景滤镜、模糊度、亮度）
- `schema_version` — JSONB 结构版本号，默认 1
- `created_at` / `updated_at` — 时间戳（updated_at 有 trigger）

不存储模型 API Key 或 provider secrets。

### user_profiles JSONB 扩展策略

`user_profiles` 包含 4 个 JSONB 预留字段（`public_profile_json` / `private_profile_json` / `ui_state_json` / `asset_settings_json`）和一个 `schema_version` 整数版本号。这些字段的设计原则：

1. **前端 UI 不应该和 DB 列一一绑定**：数据库列的职责是提供稳定的查询、索引和约束基础，不应对应到每一个 UI 组件。前端应从 JSONB 字段中按需读取自己关心的键，而不是要求每加一个开关/滑块就新增一列。

2. **不稳定的新资料/主题/头像裁剪/背景呈现参数优先进 JSONB**：
   - `public_profile_json` — 对外可见的资料扩展（如自定义标签、社交链接、展示徽章等），不存私密信息。
   - `private_profile_json` — 仅自己可见的资料扩展（如生日、时区、语言偏好等）。**绝对不能存 API key 或 provider secrets**。
   - `ui_state_json` — 前端 UI 状态持久化（如侧栏折叠、最后使用的标签页、面板宽度等）。
   - `asset_settings_json` — 资产呈现参数（如头像裁剪坐标、背景滤镜、模糊度、亮度等）。
   - 当某个 JSONB 键被频繁读写且需要索引/约束时，再将其提升为独立的数据库列。

3. **`private_profile_json` 安全红线**：虽然字段名含 "private"，但这只是逻辑上的"仅自己可见"，不提供加密保证。**任何 API key、provider secret、access token 都不得存入此字段**。密钥管理始终走 `BACKEND_MEMORY_PLAN.md` § API Key 策略（方案 A：本地浏览器存储；方案 B：将来通过 Supabase Edge Function secrets 注入）。

4. **`schema_version`**：整数版本号，默认 1。前端/后端迁移逻辑在读取 user_profiles 行时检查此值，按需执行 JSONB 结构升级，避免破坏性变更。

### memory_facts

长期事实和可检索记忆表。

字段建议：

- `id`
- `conversation_id`
- `chapter_id`
- `type`
- `content`
- `importance`
- `status`
- `source`
- `embedding`
- `created_at`
- `updated_at`
- `last_used_at`

`type` 建议：

- `world_rule`
- `character_fact`
- `relationship`
- `plot_thread`
- `promise`
- `location`
- `preference`

`status` 建议：

- `active`
- `resolved`
- `contradicted`
- `archived`

## 请求流程

### 当前流程

1. 用户发送消息。
2. 前端构建 prompt。
3. 主模型流式生成正文。
4. 辅助模型提取 sceneState。
5. 后台章节记忆任务生成 storyMemory。

### 目标流程

1. 用户发送消息。
2. 前端发送 conversation id、当前输入、当前状态给后端。
3. 后端检索相关记忆。
4. 后端返回一段紧凑记忆上下文。
5. 前端继续用现有主模型流式生成。
6. 回复完成后，前端把最终正文和状态发给后端。
7. 后端后台更新章节记忆和长期事实。

这个阶段暂时不要求后端代理主模型请求。这样风险最低。

### 当前实际流程（已偏离目标流程的设计）

当前实现与上述目标流程有重要差异，这是**有意为之**的架构决策：

1. 用户发送消息。
2. **前端立即用本地 `storyMemory` 组装 prompt 并开始主模型流式生成**（不等待任何后端）。
3. **同时**，后台异步发起 `memory-retrieve` prefetch（cache-first：优先返回 30 分钟 TTL 缓存；过期或无缓存时在后台拉取新数据）。
4. 远端检索结果**绝不阻塞当前轮流式回复**。它只更新缓存，供下一轮步骤 2 使用。
5. 回复完成后，后台 `setTimeout` 延迟 1.5s 发送 `memory-update` POST（最多重试 3 次，每次间隔 2s，避开正在流式生成的时间窗口）。
6. update 成功后自动触发一次 retrieve prefetch，刷新缓存供下一轮使用。

**关键原则：第 N 轮的远端检索结果用于第 N+1 轮。绝不用远端检索阻塞当前轮的流式回复。**

## 降低 token 的核心方法

不要每轮发送全部记忆。

每轮 prompt 建议只包含：

- 当前 sceneState，始终包含。
- 最近 6 到 12 条原文消息。
- 最近 1 到 3 个章节摘要。
- 最相关的 5 到 10 条长期事实。
- 当前未解决线索，严格限制数量。

错误方式：

- 每轮发送全部章节。
- 每轮发送全部长期事实。
- 一直追加摘要不清理。

正确方式：

- 根据用户当前输入、当前角色、当前地点、当前线索检索相关记忆。
- 给记忆上下文设置固定预算。
- 超过预算时按相关度、重要度、时间排序裁剪。

## 检索策略

### 第一阶段：关键词检索

先不要上向量数据库。

使用：

- 当前角色名
- 地点名
- 用户输入关键词
- 未解决线索关键词
- 最近场景关键词

优点：

- 便宜。
- 好调试。
- 不依赖 embedding 模型。

### 第二阶段：混合检索

同时使用：

- 全文搜索
- 向量相似度

目标：

- 降低漏召回。
- 避免塞太多无关记忆。

### 第三阶段：记忆排序

评分维度：

- 和当前输入的相关度
- 重要度
- 新近程度
- 是否未解决
- 是否涉及当前角色
- 是否涉及当前地点

只有得分最高的记忆进入 prompt。

## 后端 API 设计

### POST /api/memory/retrieve

用于每轮生成前取相关记忆。

输入：

- conversation id
- user text
- current sceneState
- token 或字符预算

输出：

- compact memory text
- selected chapter ids
- selected fact ids

失败策略：

- 后端失败时直接回退本地 `storyMemory`。
- 不能阻塞主回复。

### POST /api/memory/update

用于每轮回复完成后后台更新记忆。

输入：

- conversation id
- latest assistant content
- recent messages
- current sceneState

输出：

- updated chapters
- updated facts

失败策略：

- 只记录日志。
- 不弹 toast。
- 不影响用户继续聊天。

### POST /api/chat

后期再做。

用途：

- 后端组装 prompt。
- 后端代理模型请求。
- 后端保存 API Key。
- 后端做用量统计。

不建议现在第一步就做这个，复杂度会上升太快。

## 前端接入计划

### Step 1：抽象 Memory Adapter

先在前端增加适配层，但不接真实后端。

接口建议：

- `updateMemory(conv, storyContent)`
- `retrieveMemory(conv, userText, budget)`
- `normalizeMemory(raw)`

实现：

- `LocalMemoryAdapter`
- 预留 `RemoteMemoryAdapter`

好处：

- 先整理结构。
- 后面接 Supabase 不需要大改主流程。

### Step 2：增加远程记忆开关

设置项：

- 本地记忆
- 远程同步
- 远程检索

默认：

- 继续使用本地记忆。
- 远程功能手动开启。

### Step 3：后台同步

每轮故事完成后：

- 本地记忆先更新。
- 后端记忆后台更新。
- 后端失败不影响聊天。

### Step 4：生成前检索

生成前：

- 请求后端相关记忆。
- 成功则用后端 compact memory。
- 失败则回退本地 storyMemory。

### Step 5：跨设备同步

同步内容：

- 会话
- 设置
- 当前故事状态
- 章节记忆
- 长期事实

API Key 暂时不建议直接同步，除非后端已经有加密和账号权限。

## API Key 策略

### 方案 A：继续保存在本地

优点：

- 简单。
- 安全风险低。
- 不需要后端代理模型。

缺点：

- 每台设备都要配置。
- 后端不能独立调用模型。

### 方案 B：后端保存并代理

优点：

- 使用最方便。
- 手机和电脑登录后都能直接用。
- 后端可以独立跑记忆任务。

缺点：

- 安全要求高。
- 需要加密保存 API Key。
- 需要账号权限和接口防滥用。

客观建议：

先做方案 A。等后端账号、数据库权限和同步稳定后，再考虑方案 B。

## 实施阶段

### Phase 0：稳定当前前端

目标：

确保刚做的本地章节记忆和滚动逻辑稳定。

任务：

- 跑 10 轮以上故事测试。
- 确认记忆不显示在 UI。
- 确认记忆不阻塞主回复。
- 确认用户滑动不会被自动触底。

验收：

- A/B/C/D 不丢。
- 长对话不明显错乱。
- 用户阅读时不被打断。

### Phase 1：Memory Adapter

目标：

先把本地记忆逻辑抽象出来。

任务：

- 增加 `LocalMemoryAdapter`。
- 保持现有行为不变。
- 把 retrieve/update 入口集中。
- 为远程后端预留接口。

验收：

- 功能表现和现在一致。
- 主生成链路不变慢。
- 回退逻辑清晰。

### Phase 2：Supabase 原型

目标：

把章节记忆和长期事实存到数据库。

任务：

- 创建 Supabase 项目。
- 建表。
- 写最小同步 API。
- 每轮结束后后台上传记忆。

验收：

- 数据库能看到章节和事实。
- 后端失败不影响前端聊天。
- 本地记忆仍可独立工作。

### Phase 3：关键词检索

目标：

生成前只取相关记忆。

任务：

- 实现 `/api/memory/retrieve`。
- 用关键词、角色名、地点名检索。
- 给返回记忆设置字符预算。
- 前端接入远程检索，失败回退本地。

验收：

- prompt 里的记忆更短。
- 旧剧情关键事实能被召回。
- 无关章节不会每轮都塞进去。

### Phase 4：向量检索

目标：

提高召回准确性。

任务：

- 给 `memory_facts` 添加 embedding。
- 接入 `pgvector`。
- 做关键词和向量混合排序。
- 加入重要度、新近度、未解决状态评分。

验收：

- 比纯关键词更稳定。
- token 使用低于全量记忆注入。
- 长剧情连续性更好。

### Phase 5：后端聊天代理

目标：

让 Mira 更像真正 app。

任务：

- 后端组装 prompt。
- 后端流式代理模型回复。
- 后端加密保存 API Key。
- 统一记录用量。

验收：

- 手机和电脑登录后体验一致。
- 用户不需要每台设备重复配置。
- 后端负责上下文组装和记忆检索。

## 风险

### 复杂度上升

后端会引入新的故障点。

应对：

- 本地优先。
- 后端失败自动回退。
- 不让后端阻塞主回复。

### 记忆错误固化

辅助模型可能总结错。

应对：

- 每条记忆保存来源。
- 重要事实保留版本。
- 以后提供用户编辑和删除。

### token 不一定立刻下降

如果检索做得差，后端只是增加复杂度。

应对：

- 第一阶段就设置记忆预算。
- 记录每轮使用了哪些记忆。
- 对比本地全量记忆和后端检索记忆。

### 隐私

远程记忆意味着故事内容会上云。

应对：

- 远程记忆默认关闭。
- 明确说明同步内容。
- 提供导出和删除。

## 近期最推荐的下一步

不要马上写完整后端。

最优先做：

1. 把当前本地 `storyMemory` 包一层 `MemoryAdapter`。
2. 保持现有行为不变。
3. 增加 mock remote adapter。
4. 再接 Supabase 原型。

这样可以在不破坏当前好用版本的前提下，为数据库记忆打地基。


# 下一步执行清单（开发快照）

> **状态**: 草案阶段。以下所有步骤均为开发验证，不部署至生产、不接真实数据库。
> **原则**: 前端先行，后端只做最小验证；每一步都可独立回退；不做任何可能阻塞主回复流的操作。

---

## P0 — 保持前端稳定 + 记录当前状态

### P0.1 确认前端构建通过

```powershell
# 在项目根目录运行
npm run build
# 或如果项目用的是静态 HTML/JS，直接打开 index.html 确认页面正常加载
```

验收标准：
- 构建/加载无报错。
- `storyMemory` 章节记忆逻辑不受影响。
- A/B/C/D 选项正常生成。
- 流式回复正常，不会被阻塞。

### P0.2 确认无 secrets 进入版本控制

以下文件**可以 commit 为开发快照**：`BACKEND_MEMORY_PLAN.md`、`supabase/functions/*.ts`、`supabase/memory_schema.sql`、`supabase/migrations/*.sql`、`_check_remote_memory_contract.mjs`。

**永远不 commit**：
- `supabase/.temp/` 目录下的任何文件（已在 `.gitignore` 中忽略）。
- 任何包含真实 `service_role key`、`SUPABASE_SERVICE_ROLE_KEY` 或模型 API Key 的文件。

**Push 策略**：
- 私有仓库：可直接 push。
- 公开仓库：push 前必须检查整个仓库，尤其是 `src/01_constants.js`、`script.js`、`omnichat.html`、`index.html`、`supabase/functions/`，确认无 Supabase project URL 或 publishable key 硬编码。publishable key 本身不是 secret，但公开仓库会永久进入 git history，需要产品/运维层确认是否接受暴露。


### P0.3 记录当前功能基线

在开始任何后端验证前，确认以下功能 100% 正常：

| 功能 | 检查方式 | 状态 |
|------|----------|------|
| 主模型流式回复 | 发送任意消息，确认逐字输出 | ☐ |
| 章节记忆后台生成 | 聊 6+ 轮后打开 Chrome DevTools → Application → IndexedDB → mira → storyMemory，确认 chapters 数组非空 | ☐ |
| sceneState 提取 | 同上，确认 sceneState 对象字段完整 | ☐ |
| 用户滑动不被自动触底 | 阅读历史消息时新 token 不强制滚到底部 | ☐ |
| 记忆不显示在 UI | 聊天面板不出现 memory/system 类消息 | ☐ |
| 设置持久化 | 修改 provider/model 后刷新页面，设置保留 | ☐ |

记录日期和结果填入表格。如果任何一项失败，**先修前端，不要开始后端验证**。

### P0.4 记录本地后端工具状态

**当前状态（2026-06-12）**:
- `deno` 已安装：`2.8.2`。
- `supabase` CLI 已安装：`2.106.0`。
- Docker Desktop 已通过 winget 安装（`Docker Desktop` 已存在于系统中）。
- **Docker engine 未就绪**：启动 Docker Desktop 后 Docker engine 未在当前会话 ready。
- **WSL 未就绪**：`wsl --status` / `wsl --install` 输出乱码，实际 WSL 2 未安装或未正确配置。
- **DISM 启用 WSL/VirtualMachinePlatform 失败**：需要管理员权限（Error 740，Elevated permissions are required）。
- 已将 Docker Desktop 及 `com.docker.backend` 进程停止，避免占用资源。
- 当前 PowerShell 会话可能需要手动补 PATH；新终端应自动识别。

**影响**:
- P1 的 Deno 本地检查和 P2 的 Supabase CLI 远程部署准备（`supabase link` / `supabase functions deploy`）可以继续推进。但 P1 的核心目标仍然不是部署，而是验证 HTTP 契约和前端 RemoteMemoryAdapter 的无阻塞行为。
- **本地 `supabase start` 当前不可用**，因为它依赖 Docker engine。这不阻塞 P1，也不阻塞 P2 的远程部署（远程部署只需要 `supabase login` / `supabase link`，不需要本地 Docker）。

**保留备用方案**: 即使 Deno 可用，P1.0 的 Node.js 临时 mock server 仍保留，方便在没有 Deno 或不想启动 Supabase 本地栈时验证同一套 HTTP contract。

---

## P1 — 本地 Mock Remote 验证（不接 Supabase）

> 目标：验证前端 RemoteMemoryAdapter 链路不会 break 现有逻辑，确认函数 HTTP 契约正确。
> **P1 的核心不是部署，而是验证 RemoteMemoryAdapter 即使远程失败/空返回也不会阻塞主回复。**

### P1.0a 前端 endpoint URL 配置说明

`buildMemoryEndpointUrl()` 自动检测三种填法并映射到正确的 function 路径：

| 场景 | `memoryRemoteEndpoint` 填写值 | 实际生成的 URL |
|------|-------------------------------|----------------|
| 本地 mock server | `http://localhost:8000` | `http://localhost:8000/api/memory/update` / `…/api/memory/retrieve` |
| 任何 `/functions/v1` base（推荐） | `https://<project-ref>.supabase.co/functions/v1` 或 `http://127.0.0.1:54321/functions/v1` | `<base>/memory-update` / `<base>/memory-retrieve` |
| 具体 function URL | `https://<ref>/functions/v1/memory-update` | 原样使用，不追加路径 |

**映射规则**：
- 非 `/functions/v1` URL（如 localhost:8000，不含 `/functions/v1`）→ 直接拼接 `/api/memory/update` 或 `/api/memory/retrieve`。
- 任何 `/functions/v1` base（无论是 hosted `supabase.co` 还是本地 CLI `127.0.0.1:54321`）→ 自动把 `/api/memory/update` 映射为 `/memory-update`，`/api/memory/retrieve` 映射为 `/memory-retrieve`。
- 已指向具体函数名（URL 以 `/memory-update` 或 `/memory-retrieve` 结尾）→ 不再追加任何路径，直接原样返回。

**推荐填 `/functions/v1` base URL**：用户只需填一个值，前端自动为 update 和 retrieve 分别拼接正确的函数名。不需要为两个函数配置两个不同的 endpoint。

### P1.0 无 Deno 备用验证方案（Node.js 临时 mock server）

> **适用场景**: Deno 未安装时，用 Node.js 零依赖临时 mock server 验证 `/api/memory/update` 和 `/api/memory/retrieve` 的 HTTP 契约。
> **原则**: 不引入 `package.json`，不安装 npm 依赖，不改项目代码。只作为本地一次性命令/脚本执行。

#### 方案选择

| 方案 | 命令 | 优点 | 缺点 |
|------|------|------|------|
| A: Node 单行 stdin 脚本 | `node -e "..."` | 零文件，一行启动 | 复杂逻辑难写 |
| B: Node 临时 .mjs 文件 | 创建 `_mock_server.mjs` | 可读性好，可复用 | 多一个临时文件 |
| C: PowerShell `System.Net.HttpListener` | PS 脚本 | Windows 原生，不需要 Node | 只适用于 Windows |

**推荐方案 B**（平衡可读性和简洁性）。以下所有示例均为一次性命令/脚本，验证完毕后可删除。

#### P1.0.1 创建临时 mock server 脚本

在项目根目录创建 `_mock_server.mjs`（此文件应加入 `.gitignore`，验证完毕后删除）：

```javascript
// _mock_server.mjs — 临时 mock server，验证 HTTP 契约后删除
// 用法: node _mock_server.mjs
// 不依赖任何 npm 包，纯 Node.js 内置模块

import http from 'node:http';

const PORT = 8000;
const MEMORY_BUDGET_MAX = 2000;

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function ok(body) {
  return { status: 200, body: JSON.stringify(body) };
}

function badRequest(msg) {
  return { status: 400, body: JSON.stringify({ error: msg }) };
}

function methodNotAllowed() {
  return { status: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
}

// --- /api/memory/update ---
function handleUpdate(body) {
  if (!body || !body.conversationId) {
    return badRequest('Missing required field: conversationId');
  }
  // 当前阶段只返回 ack，不做任何存储
  return ok({ chapters: [], pinnedFacts: [], unresolvedThreads: [] });
}

// --- /api/memory/retrieve ---
function handleRetrieve(body) {
  if (!body || !body.conversationId) {
    return badRequest('Missing required field: conversationId');
  }
  if (!body.userText) {
    return badRequest('Missing required field: userText');
  }
  const budget = Math.min(
    typeof body.budget === 'number' && body.budget > 0 ? body.budget : 1000,
    MEMORY_BUDGET_MAX
  );
  // 当前阶段只返回空结果 — 这是预期行为，不是 bug
  console.log(`[retrieve] conv=${body.conversationId} budget=${budget} text="${(body.userText || '').slice(0, 40)}"`);
  return ok({ memoryText: '', selectedChapterIds: [], selectedFactIds: [] });
}

// --- Router ---
function route(method, pathname, rawBody) {
  let body = null;
  try {
    body = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return badRequest('Invalid JSON');
  }

  if (method === 'OPTIONS') {
    return { status: 204, body: '' };
  }

  if (method !== 'POST') {
    return methodNotAllowed();
  }

  if (pathname === '/api/memory/update') return handleUpdate(body);
  if (pathname === '/api/memory/retrieve') return handleRetrieve(body);

  return { status: 404, body: JSON.stringify({ error: 'Not Found' }) };
}

// --- Server ---
const server = http.createServer((req, res) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  let rawBody = '';
  req.on('data', (chunk) => { rawBody += chunk; });
  req.on('end', () => {
    const parsed = new URL(req.url, `http://localhost:${PORT}`);
    const { status, body } = route(req.method, parsed.pathname, rawBody);
    res.writeHead(status, corsHeaders());
    res.end(body);
  });
});

server.listen(PORT, () => {
  console.log(`[mock-server] listening on http://localhost:${PORT}`);
  console.log(`[mock-server] endpoints:`);
  console.log(`  POST /api/memory/update`);
  console.log(`  POST /api/memory/retrieve`);
  console.log(`[mock-server] press Ctrl+C to stop`);
});
```

#### P1.0.2 启动 mock server

```powershell
# 在项目根目录运行（PowerShell）
node _mock_server.mjs
```

期望输出：
```
[mock-server] listening on http://localhost:8000
[mock-server] endpoints:
  POST /api/memory/update
  POST /api/memory/retrieve
[mock-server] press Ctrl+C to stop
```

#### P1.0.3 curl 验证 memory-update

```bash
curl -X POST http://localhost:8000/api/memory/update \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test-conv-001","storyContent":"用户说：我走向城堡大门。"}'
```

期望输出: `{"chapters":[],"pinnedFacts":[],"unresolvedThreads":[]}`

#### P1.0.4 curl 验证 memory-retrieve

```bash
curl -X POST http://localhost:8000/api/memory/retrieve \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test-conv-001","userText":"我推开大门","budget":2000}'
```

期望输出: `{"memoryText":"","selectedChapterIds":[],"selectedFactIds":[]}`

#### P1.0.5 curl 验证错误处理

```bash
# 缺少 conversationId → 400
curl -s -X POST http://localhost:8000/api/memory/retrieve \
  -H "Content-Type: application/json" \
  -d '{"userText":"hello","budget":100}'
# 期望: {"error":"Missing required field: conversationId"}

# OPTIONS preflight → 204（无 body）
curl -s -o nul -w "%{http_code}" -X OPTIONS http://localhost:8000/api/memory/update
# 期望: 204

# GET 方法 → 405
curl -s -X GET http://localhost:8000/api/memory/update
# 期望: {"error":"Method Not Allowed"}

# 非法 JSON → 400
curl -s -X POST http://localhost:8000/api/memory/update \
  -H "Content-Type: application/json" \
  -d 'not json'
# 期望: {"error":"Invalid JSON"}
```

#### P1.0.6 清理

验证完毕后：

```powershell
# 停止 mock server（Ctrl+C），然后删除临时文件
Remove-Item _mock_server.mjs
```

#### P1.0.7 回归 Deno 方案

安装 Deno 后，可以回到 P1.1-P1.4 用真实的 Supabase Edge Function 代码验证。但 P1.0 的 mock server 已经覆盖了核心 HTTP 契约验证，Deno 方案主要用于验证 Edge Function 代码本身（包括 Supabase 特定 API 如 `serve()`）。

#### P1.0.8 关键验证：主回复不被阻塞

无论使用 Deno 方案还是 Node 方案，**P1.5 的验证是 P1 阶段最重要的验收项**：

- 在前端浏览器 Console 中手动调用 `fetch` 到 `http://localhost:8000`，确认请求在后台完成、不阻塞 UI。
- 关闭 mock server 后再次发送聊天消息，确认前端静默回退到本地 `storyMemory`，**不弹 toast、不抛异常、不影响流式输出速度**。
- 这是整个后端记忆架构的红线：远程失败永远不应该让用户感知到。

### P1.1 本地启动 Deno 服务

```powershell
# 在项目根目录，分别启动两个函数（需要安装 Deno）
deno run --allow-net --allow-env supabase/functions/memory-update/index.ts
# 另一个终端
deno run --allow-net --allow-env supabase/functions/memory-retrieve/index.ts
```

默认监听 `localhost:8000`。如果端口冲突，用 `--port` 指定。

### P1.2 curl 验证 memory-update

```bash
curl -X POST http://localhost:8000/api/memory/update \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv-001",
    "storyContent": "用户说：我走向城堡大门。助手说：大门缓缓打开，里面一片漆黑。",
    "sceneState": {"currentCharacter": "冒险者", "location": "城堡入口"},
    "storyMemory": {"chapters": []},
    "recentMessages": []
  }'
```

**期望输出**:
```json
{"chapters":[],"pinnedFacts":[],"unresolvedThreads":[]}
```

### P1.3 curl 验证 memory-retrieve

```bash
curl -X POST http://localhost:8000/api/memory/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "test-conv-001",
    "userText": "我推开大门",
    "budget": 2000,
    "sceneState": {"currentCharacter": "冒险者"},
    "storyMemory": {"chapters": []},
    "recentMessages": []
  }'
```

**期望输出**:
```json
{"memoryText":"","selectedChapterIds":[],"selectedFactIds":[]}
```

### P1.4 curl 验证错误处理

测试缺少必填字段、错误 HTTP 方法、非法 JSON：

```bash
# 缺少 conversationId → 应返回 400
curl -s -X POST http://localhost:8000/api/memory/retrieve \
  -H "Content-Type: application/json" \
  -d '{"userText":"hello","budget":100}' | jq .

# OPTIONS preflight → 应返回 204
curl -s -o /dev/null -w "%{http_code}" -X OPTIONS http://localhost:8000/api/memory/update

# GET 方法 → 应返回 405
curl -s -X GET http://localhost:8000/api/memory/update | jq .

# 非法 JSON → 应返回 400
curl -s -X POST http://localhost:8000/api/memory/update \
  -H "Content-Type: application/json" \
  -d 'not json' | jq .
```

### P1.5 确认不影响主回复流式

这是最关键的一项验证。

**方法 A（推荐）**: 在前端代码中临时将 `memoryMode` 改为 `'remote'`，将 `memoryRemoteEndpoint` 指向 `http://localhost:8000`，然后正常聊天 5 轮以上。

**方法 B（不碰代码）**: 在前端浏览器 Console 中手动调用 RemoteMemoryAdapter 的 fetch 路径，确认：
- fetch 请求在后台完成，不阻塞主回复。
- fetch 失败时（关闭本地 Deno 服务），不回退逻辑正确触发，不影响用户继续聊天。
- 不弹出任何 toast 或错误提示。

**验收标准**:
- 主回复流式速度和关闭远程记忆时一致（偏差 < 200ms）。
- 远程函数返回慢或无响应时，用户看不到任何差异。
- Console 中无未捕获异常。

---

## 环境阻塞条件：本地 supabase start

> **状态（2026-06-12）**：本地 `supabase start` 当前不可用。这不阻塞 P1 和远程 P2，只阻塞本地 Supabase 开发栈。

### 阻塞原因

`supabase start` 依赖 Docker engine 来运行本地 Postgres、Inbucket、Kong 等服务。当前环境：

1. **Docker Desktop 已安装**，但启动后 Docker engine 未就绪。
2. **WSL 2 未正确配置**：`wsl --status` 输出乱码，表明 WSL 2 未安装或已损坏。
3. **DISM 启用 Windows 功能需要管理员权限**：`dism.exe /online /enable-feature` 报 Error 740（Elevated permissions are required），当前终端未以管理员身份运行。

### 所需操作（需要管理员权限）

以**管理员身份**打开 PowerShell 或命令提示符，依次执行：

```powershell
# 1. 启用 Windows Subsystem for Linux
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart

# 2. 启用虚拟机平台（WSL 2 依赖 Hyper-V 架构）
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

# 3. 安装/更新 WSL（默认安装 WSL 2 + Ubuntu）
wsl --install

# 4. 重启 Windows
# 重启后打开 Docker Desktop，等待 Docker engine 就绪
```

### 什么不受影响

| 事项 | 是否阻塞 | 说明 |
|------|----------|------|
| **P1 Deno 本地验证** | ❌ 不阻塞 | Deno 直接运行 Edge Function，不依赖 Docker |
| **P1 Node.js mock server** | ❌ 不阻塞 | 纯 Node.js 内置模块，零依赖 |
| **P2 远程 Supabase 部署** | ❌ 不阻塞 | `supabase login` / `supabase link` / `supabase functions deploy` 都不需要本地 Docker |
| **P2 远程 curl 验证** | ❌ 不阻塞 | 远程函数部署后直接用 curl 验证 |
| **P2 schema 部署（Dashboard SQL Editor）** | ❌ 不阻塞 | 使用 `supabase/memory_schema.sql`，通过 Supabase Dashboard SQL Editor 执行 |
| **P2 schema 部署（远程 CLI `db push`）** | ❌ 不阻塞 | 需要 `supabase login` + `supabase link --project-ref <ref>`，使用 `supabase/migrations/` 目录文件，不依赖本地 Docker |
| **本地 supabase start** | ✅ 阻塞 | 需要 Docker engine + WSL 2 就绪 |
| **本地 supabase db push / migration up** | ✅ 阻塞 | 依赖本地 Docker engine，同上 |
| **本地 supabase functions serve** | ✅ 阻塞 | 同上 |

### 结论

当前阻塞只影响"在本地完整运行 Supabase 全套开发栈"这一个场景。P1 的 Deno 单函数测试和 P2 的远程 Supabase 部署（包括远程 `supabase db push`）完全不受影响，可以继续推进。等 WSL + Docker 就绪后，本地 `supabase start` 自然可用。

---

## P2 — Supabase 最小部署验证

> 目标：只把当前空 ack 函数和 schema 部署到 Supabase，验证基础设施可用，
> **不传 API Key，不代理主模型，不写真实数据**。

### P2.1 创建 Supabase 项目

1. 登录 [supabase.com](https://supabase.com)。
2. 创建新项目，选择免费 tier。
3. 记录 `Project URL` 和 `anon key`（不记录 `service_role key` 到本地文件）。

### P2.2 部署 Schema

有两种部署方式，根据使用场景选择。

#### 方式 A：Dashboard SQL Editor（推荐个人/原型阶段）

在 Supabase Dashboard → SQL Editor 中粘贴 `supabase/memory_schema.sql` 全文并执行。

优点：无需 CLI，即时反馈。适合快速原型和单人项目。

#### 方式 B：Supabase CLI migration（推荐团队/版本管理阶段）

```bash
# 前置条件：supabase login + supabase link --project-ref <ref>
supabase db push
```

CLI 会自动执行 `supabase/migrations/` 目录下的 migration 文件，**按时间戳顺序**执行。

**重要：`memory_schema.sql` 与 migrations 的关系**

| 文件 | 角色 | 何时更新 |
|------|------|----------|
| `supabase/memory_schema.sql` | **当前完整参考 schema** — 反映所有已生效的结构变更，可在 Supabase Dashboard SQL Editor 中一次性执行来部署新库 | 每次结构变更后立即更新 |
| `supabase/migrations/20260612130000_create_memory_schema.sql` | **历史基础 migration** — 创建时的初始 schema 快照。**不会**回写后续新增字段（如 `client_conversation_id`、`user_profiles`、JSONB 扩展列等），也不应声称与当前 `memory_schema.sql` 完全同步 | 历史文件，原则上不修改 |
| `supabase/migrations/20260614170000_add_client_conversation_id.sql` | 增量 migration — 补充 20260612130000 之后新增的结构 | 仅当该功能首次引入时 |
| `supabase/migrations/20260614171000_grant_service_role_memory_tables.sql` | 权限增量 migration | 同上 |
| `supabase/migrations/20260614172000_add_user_profiles.sql` | 增量 migration — `user_profiles` 表及权限 | 同上 |

**新项目部署选择（二选一，不要混用到同一个空库）**：

- **路径 A（Dashboard SQL Editor）**：在 Supabase Dashboard → SQL Editor 中执行 `supabase/memory_schema.sql` 全文。简单直接，一次性包含所有最新结构。
- **路径 B（Supabase CLI）**：`supabase db push` 或 `supabase migration up`，按时间戳顺序执行 `migrations/` 目录下所有文件。适合需要版本管理和团队协作的项目。

**混用风险**：如果在空库上先执行 `memory_schema.sql`（路径 A），再运行 `supabase db push`（路径 B），CLI 会尝试执行 migrations 中已存在的 DDL（如 `CREATE TABLE IF NOT EXISTS`），虽然幂等 migration 不会报错，但 CLI 的 migration 历史表会记录这些 migration 为"已执行"，而 `memory_schema.sql` 的变更在该表中无记录，导致后续状态不一致。**始终只选一条路径**。

#### 当前环境限制

| 命令 | 是否可用 | 原因 |
|------|----------|------|
| `supabase db push`（远程） | ✅ 可用 | 需要 `supabase login` + `supabase link --project-ref <ref>`，不依赖本地 Docker |
| `supabase db push`（本地） | ❌ 阻塞 | 依赖本地 Docker engine + WSL 2，当前未就绪（见"环境阻塞条件"） |
| `supabase migration up`（本地） | ❌ 阻塞 | 同上 |

**结论**：Schema 部署当前可通过 Dashboard SQL Editor（方式 A）或远程 `supabase db push`（方式 B）完成。本地 `supabase start` / 本地 `supabase db push` 因 Docker/WSL 阻塞暂不可用，但不影响远程部署。

**验证**:
- 所有 6 张表创建成功（`conversations`, `messages`, `story_states`, `story_chapters`, `memory_facts`, `user_profiles`）。
- 索引创建成功。
- 触发器创建成功。
- RLS 保持**关闭**（personal mode）。

### P2.3 部署 Edge Functions

```bash
# 需要先安装 Supabase CLI 并登录
supabase login
supabase link --project-ref <your-project-ref>

# 部署
supabase functions deploy memory-update
supabase functions deploy memory-retrieve
```

### P2.4 远程 curl 验证

用 Supabase 项目 URL 替换 localhost：

```bash
# 远程 memory-update
curl -X POST https://<project-ref>.supabase.co/functions/v1/memory-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -d '{"conversationId":"test-001","storyContent":"test"}'

# 期望: {"chapters":[],"pinnedFacts":[],"unresolvedThreads":[]}

# 远程 memory-retrieve
curl -X POST https://<project-ref>.supabase.co/functions/v1/memory-retrieve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <anon-key>" \
  -d '{"conversationId":"test-001","userText":"hello","budget":1000}'

# 期望: {"memoryText":"","selectedChapterIds":[],"selectedFactIds":[]}
```

### P2.5 确认不传 API Key

在 Supabase Dashboard → Edge Functions → Logs 中确认：
- 请求体中没有 `apiKey`、`providerKey`、`openaiKey` 等字段。
- 函数只读取 `conversationId`、`storyContent`/`userText`、`budget` 等业务字段。
- 函数内部没有读取任何模型 API Key 环境变量（当前不需要）。

### P2.6 确认不代理主模型

- 两个函数**只返回 ack / 空结果**。
- 不做任何 HTTP 请求到 OpenAI / Anthropic / Gemini / DeepSeek。
- 不做任何数据库读写。
- Execution time 应在 50ms 以内（空 stub 情况）。

---

## P3 — 真实数据库写入/检索的设计验收标准

> 这些标准在**真正动手实现数据库逻辑**之前必须全部通过评审。

### P3.1 失败回退

| 场景 | 预期行为 |
|------|----------|
| 数据库连接失败 | 函数返回 ack（空结果），前端回退本地记忆，不弹 toast |
| 查询超时（> 3s） | 函数内部超时后返回空结果，不阻塞前端 |
| 写入冲突（duplicate chapter index） | UPSERT 处理，不抛异常 |
| conversation_id 不存在 | update 应创建新记录；retrieve 返回空 |
| 函数冷启动延迟（首次 > 1s） | 前端 fetch 设置合理 timeout（如 5s），超时即回退 |
| Supabase 服务宕机 | 前端 catch fetch 异常，静默回退本地记忆 |

**验证方法**: 逐一制造故障场景（关数据库、删表、改 schema），确认前端聊天不受影响。

### P3.2 预算限制

| 项目 | 硬限制 |
|------|--------|
| 每轮检索返回记忆文本 | ≤ 2000 字符（可配置） |
| 每轮检索返回章节摘要数 | ≤ 3 个 |
| 每轮检索返回长期事实数 | ≤ 10 条 |
| database query row limit | ≤ 50 行/查询 |
| 函数执行总超时 | ≤ 10s（Supabase free tier 上限） |
| 函数响应体大小 | ≤ 64KB |

**实现要点**:
- `memoryText` 拼接时按 `importance DESC, updated_at DESC` 排序，超出预算直接截断。
- 截断时不打断 UTF-8 多字节字符。
- 返回 `truncated: true` 标志让前端知道记忆被裁剪。

### P3.3 隐私开关

前端设置项（预期 UI 文案）：

| 设置 | 默认值 | 说明 |
|------|--------|------|
| 远程记忆 | **关闭** | 开启后对话内容会加密传输到云端存储 |
| 远程检索 | **关闭** | 开启后在生成回复前从云端检索相关记忆 |
| 导出记忆 | — | 一键下载所有云端记忆为 JSON |
| 删除云端记忆 | — | 删除当前会话的所有云端记忆（不可恢复） |

**验收标准**:
- 默认关闭所有远程功能 → 新用户零感知。
- 开启远程记忆前需要用户明确点击开关（不能通过 URL 参数或其他方式默认打开）。
- 关闭远程记忆后，已存储在云端的记忆**不自动删除**（用户可能只是想暂时关掉），但前端不再发送/接收数据。
- 删除云端记忆需要二次确认弹窗。

### P3.4 数据完整性

- 每个 `memory_fact` 行必须包含 `source` 字段，指向来源章节或消息 ID。
- 章节索引 `chapter_index` 不允许跳跃（同一 conversation 内连续）。
- `importance` 字段默认值 5，范围 1-10。
- `status` 变更记录在日志中（未来可加 `status_changed_at` 字段）。

### P3.5 不阻塞主回复的架构要求

```
用户发送消息
  │
  ├─ 1. 主模型流式生成 ────────────────── 立即开始，不等待任何后端
  │     （使用本地 storyMemory + sceneState）
  │
  └─ 2. 后台异步任务（不阻塞步骤 1）
        ├─ 2a. 远程检索（POST /api/memory/retrieve）
        │      失败 → 静默，不影响步骤 1
        │      成功 → 记忆文本缓存到本地，下一轮步骤 1 可用
        │
        └─ 2b. 回复完成后 → 远程更新（POST /api/memory/update）
               失败 → 静默，重试队列（未来）
               成功 → 更新本地缓存时间戳
```

**关键原则**: 第 N 轮的远程检索结果用于第 N+1 轮的本地 prompt 组装。**绝不用第 N 轮的远程检索结果阻塞第 N 轮的流式回复**。

---

## 禁止项

以下操作在草案阶段（P0-P2）**绝对禁止**，在 P3 阶段也需逐项评审后才能放开：

| # | 禁止项 | 原因 |
|----|--------|------|
| 1 | **同步 API Key 到后端** | 安全风险。API Key 必须始终只存在于用户本地浏览器存储中。Edge Function 需要调用模型时通过 Supabase secrets 注入，不由前端传入。 |
| 2 | **后端阻塞主回复流** | 架构红线。记忆检索和更新必须是后台异步操作，失败完全静默。绝不 `await remoteRetrieve()` 之后再调用主模型。 |
| 3 | **默认开启远程记忆** | 隐私红线。所有远程功能必须默认关闭，用户手动开启后才生效。 |
| 4 | **把 secrets 或 service_role key 提交到仓库** | `supabase/.temp/` 和任何包含真实 `service_role key` / `SUPABASE_SERVICE_ROLE_KEY` 的文件永远不入 Git。后端原型代码、schema、migration、检查脚本可以 commit 为开发快照。公开仓库 push 前必须检查整个仓库，尤其是 `src/01_constants.js`、`script.js`、`omnichat.html`、`index.html`、`supabase/functions/`，确认无 Supabase project URL 或 publishable key 硬编码。publishable key 本身不是 secret，但公开仓库会永久进入 git history，需要产品/运维层确认是否接受暴露。 |
| 5 | **在 schema 或函数中硬编码 API Key / 密码** | 即使是注释掉的示例代码也不行。不要在任何地方留下真实的 key 字符串。 |
| 6 | **修改前端 src/*.js / index.html / omnichat.html** | P0-P2 草案阶段不改前端代码。所有后端验证通过 curl 或独立测试页面完成。当前 P2 阶段前端已接入 RemoteMemoryAdapter（src/99_legacy_main.js），这是预期内的改动，不在此禁止项范围内。 |
| 7 | **在 Supabase 项目中启用 RLS 但未配置 Auth** | 会导致所有请求被拒绝，难以排查。Personal mode 先不开 RLS，等有账号系统后再配。 |
| 8 | **把 service_role key 写入本地文件或环境变量** | service_role key 可以跳过 RLS，泄露后果严重。本地开发用 anon key 足够；service_role 只通过 Supabase Dashboard secrets 注入。 |

---

## 提交/推送前安全检查

每次 `git commit` 或 `git push` 前，必须通过以下检查。这些检查已集成到 `_check_stability.mjs` 和 `_check_remote_memory_contract.mjs` 中，运行这两个脚本即可自动验证。

### 1. supabase/.temp/ 永远不提交

- `supabase/.temp/` 是 Supabase CLI 的本地临时目录，包含 `project-ref`、`linked-project.json` 等文件。已在 `.gitignore` 中忽略。
- 每次 push 前确认 `git ls-files supabase/.temp` 返回空（没有任何文件被 git 跟踪）。
- 如果发现已跟踪的 `.temp` 文件：`git rm --cached supabase/.temp/*` 然后提交。

### 2. service_role key / SUPABASE_SERVICE_ROLE_KEY 永远不提交

- `SUPABASE_SERVICE_ROLE_KEY` 只能通过 Supabase Dashboard → Edge Function Secrets 注入，或以环境变量方式在 Edge Function 中读取（`Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`）。
- **任何 `SUPABASE_SERVICE_ROLE_KEY=eyJ...` 或 `SUPABASE_SERVICE_ROLE_KEY=sb_...` 形式的真实密钥赋值绝对不能出现在仓库源码中。**
- Edge Function 源码中引用环境变量名是安全的（如 `const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")`），因为这不是真实密钥值。
- 如果密钥曾经提交过，即使后续删除，仍可通过 git history 恢复。此时必须：在 Supabase Dashboard 中 rotate 该 key → 旧 key 立即失效 → 更新 Edge Function secrets → 清理 git history（`git filter-branch` 或 `BFG Repo-Cleaner`）。

### 3. 模型 API Key 永远不提交

- 模型 API Key（OpenAI、Anthropic、DeepSeek 等）始终只保存在用户本地浏览器存储中。**绝不出现在仓库任何文件中。**
- 如果将来 Edge Function 需要调用辅助模型，API Key 通过 Supabase Dashboard → Edge Function Secrets 注入，不由前端传入、不出现在源码中。

### 4. publishable key 和 project URL 的暴露风险

- **publishable key（anon key）本身不是 secret** — 它是公开的，任何人都可以从浏览器网络请求中获取。
- **但是**，当仓库公开时，project URL 和 publishable key 会永久进入 git history（即使后续删除，仍可通过 `git log` 恢复）。这会带来以下风险：
  - 任何人都知道你的 Supabase project URL，可以绕过你的前端直接调用 Edge Functions 和 API。
  - 在 personal mode（无 Auth、无 RLS）下，这意味着任何人都能读写你的数据库。
  - 即使以后启用了 Auth + RLS，project URL 的历史暴露仍然永久存在。
- **Push 前的决策**：
  - **私有仓库**：风险较低。project URL / publishable key 的暴露范围限于有权访问仓库的人。可以直接 push。
  - **公开仓库**：push 前必须在产品/运维层面明确接受以下事实 — project URL 和 publishable key 将永久公开，任何人可通过 git history 找到它们。如果不接受这个风险，必须将默认配置值改为 placeholder（如 `"YOUR_SUPABASE_URL"`），并让用户从环境变量或设置页面自行填入。
- **当前状态**：本仓库 `src/01_constants.js` / `script.js` / `omnichat.html` / `index.html` 中可能包含 Supabase project URL 和 publishable key 的默认值。这是为了方便开发调试，但 **push 到公开仓库前必须接受上述风险**。

### 5. 远端 contract 测试数据

- `_check_remote_memory_contract.mjs` 在 **远程模式**（`RUN_REMOTE_MEMORY_CONTRACT=1`）下会向远端 Supabase 写入 `contract-*` 前缀的测试 conversation 和 memory_fact。
- **默认关闭**：不带 `RUN_REMOTE_MEMORY_CONTRACT=1` 运行只做源码静态分析，不发送任何网络请求。这是日常开发和 CI 的安全默认值。
- **手动启用**：只在需要验证远端 round-trip 时显式设置环境变量。测试数据是自我标识的（`contract-*` 前缀），可以留在 DB 中。
- **不要在 CI 或自动化流程中默认开启远端模式**，除非远端是专门的 staging 环境。

### 6. 自动化检查

以上规则已编码到以下检查脚本中，每次提交前按顺序运行：

```powershell
node _check_release_readiness.mjs       # ★ 只读汇总检查 — 分组未提交改动，集中提示 secret/Supabase/远端测试风险
node _check_stability.mjs               # 包含 secret hygiene + gitignore + git tracking 检查
node _check_remote_memory_contract.mjs  # 包含 secret hygiene + pre-commit hygiene + doc 检查
```

- **`_check_release_readiness.mjs` 是只读脚本**：不会 stage、commit、push，不会发送网络请求。它只汇总当前未提交改动并按路径分组，帮助用户决定是否需要拆提交；同时集中检查 secret 泄露、Supabase 默认值暴露和远端测试环境变量。
- 如果任一脚本 exit 1，说明有安全问题需要修复。

---

## 验收命令 / 检查项

在完成每个 Phase 后，运行以下检查：

### 每次验证前必查

```powershell
# 1. 确认无 secrets 被 commit
git diff --staged --name-only
# 确认暂存区无 supabase/.temp/ 文件、无包含 service_role key 的文件
# 如不确定，运行: rg -l "service_role|SUPABASE_SERVICE_ROLE_KEY" supabase/

# 2. 确认前端构建通过（根据项目实际构建命令调整）
npm run build
# 或直接打开 index.html / omnichat.html 确认页面正常
```

### P1 验收

**方案 A：Deno（需要 Deno 已安装）**

```powershell
# Deno 函数本地运行 + curl 测试
deno run --allow-net --allow-env supabase/functions/memory-update/index.ts &
deno run --allow-net --allow-env supabase/functions/memory-retrieve/index.ts &

# 分别执行 P1.2 - P1.4 的 curl 命令，确认返回值符合预期
# 然后执行 P1.5 的流式不阻塞验证
```

**方案 B：Node.js mock server（Deno 未安装时使用）**

```powershell
# 启动 mock server（零依赖，纯 Node.js 内置模块）
node _mock_server.mjs

# 分别执行 P1.0.3 - P1.0.5 的 curl 命令，确认返回值符合预期
# 然后执行 P1.0.8 / P1.5 的流式不阻塞验证
```

**两种方案的验收标准完全一致** — 核心是验证 HTTP 契约和前端无阻塞回退，不依赖具体 server 实现。

### P2 验收

```bash
# 远程函数只返回 ack
curl -s https://<ref>.supabase.co/functions/v1/memory-update \
  -H "Authorization: Bearer <anon>" \
  -d '{"conversationId":"t1","storyContent":"x"}' | jq .
# 期望: {"chapters":[],"pinnedFacts":[],"unresolvedThreads":[]}

curl -s https://<ref>.supabase.co/functions/v1/memory-retrieve \
  -H "Authorization: Bearer <anon>" \
  -d '{"conversationId":"t1","userText":"x","budget":100}' | jq .
# 期望: {"memoryText":"","selectedChapterIds":[],"selectedFactIds":[]}
```

### 远端记忆契约检查（每次修改 Edge Function 或前端后运行）

使用 `_check_remote_memory_contract.mjs` 自动化检查源码契约和远端行为，避免只靠人工 curl 遗漏问题。

**默认模式（只检查源码，不发网络请求）**:

```powershell
node _check_remote_memory_contract.mjs
```

**远端模式（会写一条 test conversation/fact 到远端 DB）**:

```powershell
# 使用默认 endpoint
$env:RUN_REMOTE_MEMORY_CONTRACT='1'; node _check_remote_memory_contract.mjs

# 指定自定义 endpoint
$env:RUN_REMOTE_MEMORY_CONTRACT='1'; $env:REMOTE_MEMORY_ENDPOINT='https://<your-ref>.supabase.co/functions/v1'; node _check_remote_memory_contract.mjs
```

**检查内容**:

| 类别 | 检查项 | 阶段 |
|------|--------|------|
| 源码 | Edge Function 源文件存在 | 默认 |
| 源码 | CORS Allow-Headers 包含 Content-Type, Authorization, apikey | 默认 |
| 源码 | getOptionalAuthUserId 同时存在于 update 和 retrieve | 默认 |
| 源码 | resolveConversationOwnership 存在 | 默认 |
| 源码 | conversation 创建使用 .insert() 而非 .upsert() | 默认 |
| 源码 | .is("user_id", null) 条件认领 | 默认 |
| 源码 | malformed Authorization → 401 | 默认 |
| 源码 | retrieve 有 emptyResult 且无主匿名访问 owned row 返回 emptyResult | 默认 |
| 源码 | 无会话 → emptyResult | 默认 |
| 前端 | buildRemoteMemoryHeaders 未登录时只有 Content-Type，不发 apikey/Authorization | 默认 |
| 密钥 | 无 service_role JWT / sb_secret 等硬编码 | 默认 |
| 远端 | POST update personal mode → 200 ok:true | 远端模式 |
| 远端 | POST retrieve personal mode → 200 + memoryText 包含测试内容 | 远端模式 |
| 远端 | malformed Authorization → 401（未部署则为 WARN） | 远端模式 |

**退出码**: 源码契约破坏或远端基本功能失败 → exit 1；malformed auth 非 401 → WARN 但不 exit 1（因为可能尚未部署 Phase 1.1）。

### P3 验收（设计评审，无需运行命令）

- [ ] 失败回退矩阵中每种场景都有明确的预期行为。
- [ ] 预算限制中每个数值都有理由（不是随口说的）。
- [ ] 隐私开关默认值全部为"关闭"。
- [ ] 架构图中"远程检索不阻塞主回复"用红色标记为硬约束。
- [ ] 每个数据库写操作都有对应的失败处理路径。

---

## 已识别风险（补充）

以下风险在现有计划中未充分讨论，在此补充：

### R1: Edge Function 冷启动延迟

**现象**: Supabase free tier 的 Edge Function 在闲置后首次调用可能有 1-3 秒冷启动延迟。
**影响**: 如果在前端 `await` 远程检索结果，用户会感觉到明显延迟。
**缓解**: 已在 P3.5 架构中明确要求"第 N 轮检索结果用于第 N+1 轮"，彻底规避此风险。但需要在实现时严格执行。

### R2: CORS 配置过于宽松

**现象**: 当前两个函数使用 `Access-Control-Allow-Origin: *`。
**影响**: 任何网站都可以向函数发送请求。
**当前判断**: 在 personal/prototype 模式下（无 Auth、无 JWT、service_role 绕过 RLS），CORS `*` 是可接受的 —— 函数本身不暴露任何私有数据，只处理客户端传入的 conversationId 和 storyContent。攻击面仅限于垃圾写入（需知道有效的 client_conversation_id）。
**缓解**: 接入 Supabase Auth + RLS 后，应将 `*` 改为前端部署域名（如 `https://omnichat.example.com`），并同时启用 JWT 验证。

### R3: pgcrypto 扩展可用性

**现象**: `memory_schema.sql` 依赖 `pgcrypto` 扩展用于 `gen_random_uuid()`。
**影响**: 部分 Supabase 项目可能未启用此扩展，导致建表失败。
**缓解**: Supabase 默认已包含 `pgcrypto`，但执行 schema 前应在 SQL Editor 中先运行 `SELECT gen_random_uuid();` 确认可用。如果不可用，改用 `uuid_generate_v4()`（需要 `uuid-ossp` 扩展）或 Supabase 内置的 `auth.uid()` 模式。

### R4: 无记忆去重机制

**现象**: 当前 schema 没有唯一约束防止重复记忆写入。
**影响**: 同一事实可能被多次提取和存储，浪费存储空间和检索预算。
**缓解**: 在 P3 实现时，对 `memory_facts` 增加一个 `content_hash` 计算列（`sha256(content)`），并在 `(conversation_id, content_hash)` 上建唯一索引。写入前先检查是否存在相似内容。

### R5: 辅助模型选择未定义

**现象**: 计划中提到"辅助模型提取 sceneState / 章节记忆"，但未指定用哪个模型。
**影响**: 不同模型的总结质量和成本差异很大，选错可能浪费 token 或产生低质量记忆。
**缓解**: P3 设计评审时明确辅助模型选择标准：
- 优先选用**便宜且快**的模型（如 GPT-4o-mini、Claude Haiku、DeepSeek-V3）。
- 辅助模型不参与流式回复，只做离线总结和提取。
- 总结 prompt 需要包含输出 schema 约束，减少幻觉。
- 可以复用用户配置的主 provider API Key（如果用户允许），也可以使用项目级 API Key。

### R6: client_conversation_id ≠ UUID（兼容问题）

**现象**: 前端 `conv.id` 由 `generateId()` 生成（`Date.now().toString(36) + random`），不是 UUID。如果直接写入 uuid 列会失败。
**影响**: Edge Functions 收到 `conversationId` 后无法直接用其作为 FK 写入 messages/story_states/memory_facts。
**缓解（已实现）**:
- `conversations` 保留 `id uuid PK`，新增 `client_conversation_id text NOT NULL DEFAULT ''`。
- 建唯一部分索引：`CREATE UNIQUE INDEX idx_conversations_client_conv_id ON conversations (client_conversation_id) WHERE client_conversation_id != ''`。
- Edge Functions 先用 `client_conversation_id` 查找/创建 conversations 行，获取 uuid，再用 uuid 做 FK 写入。
- 增量 migration `20260614170000_add_client_conversation_id.sql` 是幂等的，可安全在已有旧 schema 的远程 DB 上执行。

---

## 实施进度（2026-06-14）

### ✅ 已完成：Phase 2 最小 DB 写入/检索

以下改动在本地完成，**未部署至生产**：

1. **Schema**:
   - `memory_schema.sql` 已添加 `client_conversation_id` 列和索引（当前完整参考 schema）。`migrations/20260612130000_create_memory_schema.sql` 为历史基础 migration，**不会**回写此后的结构变更；`client_conversation_id` 的增量通过 `20260614170000` 补齐。
   - 新增增量 migration `migrations/20260614170000_add_client_conversation_id.sql`（幂等）。
   - 新增增量 migration `migrations/20260614171000_grant_service_role_memory_tables.sql`（幂等；显式授予 service_role 表权限）。
   - 新增增量 migration `migrations/20260614172000_add_user_profiles.sql`（幂等；预留未来 Auth 用户资料表，不接前端）。

   **Migration 顺序规则**：Supabase CLI 按 migration 文件名时间戳顺序执行。Migration 只能引用已存在的表，不得引用未来 migration 才创建的表。例如 `20260614171000` 不能引用 `user_profiles`（该表在 `20260614172000` 才创建）。每个表的 GRANT 应在创建该表的 migration 内完成。

2. **memory-update** (`supabase/functions/memory-update/index.ts`):
   - 接入 `@supabase/supabase-js@2` via esm.sh。
   - 使用 `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 环境变量。
   - 验证 payload → 查找/创建 conversation → upsert story_states → 写入 memory_fact（含去重检查）。
   - 返回 `{ ok, conversationUuid, insertedFact, chapters, pinnedFacts, unresolvedThreads }`。
   - DB 错误返回 500 generic error（不泄漏 secret）。

3. **memory-retrieve** (`supabase/functions/memory-retrieve/index.ts`):
   - 接入 Supabase client。
   - 用 `client_conversation_id` 查找 uuid。
   - 查 active memory_facts（importance DESC, updated_at DESC，最多 10 条）。
   - 在 budget 内组装 memoryText，返回 `selectedFactIds`。

4. **文档更新**:
   - `supabase/functions/README.md` — 更新为当前真实状态。
   - 本文档 — 新增 R6 和本进度节。

### 未做 / 留待后续

- ❌ 不调用辅助模型（不生成真正的章节摘要）。
- ❌ 不写入 `messages` 表。
- ❌ 不写入 `story_chapters` 表。
- ❌ 不做向量检索（pgvector）。
- ❌ 不部署至生产。

### Phase 2 最小契约边界（当前阶段）

> **当前 Edge Function 是 "Phase 2 minimal contract"，不是完整后端记忆系统。**

**明确范围**：

| 功能 | 当前状态 | 说明 |
|------|----------|------|
| 写入 `conversations` | ✅ | 用 `client_conversation_id` 查找或创建 |
| 写入 `story_states` | ✅ | upsert 保存 sceneState / storyMemory 快照 |
| 写入 `memory_facts` | ✅ | 每个 storyContent 写入一条 plot_thread 事实（最多 1000 字符），deterministic-id 去重 |
| 查询 `memory_facts` | ✅（仅 retrieve） | 按 importance DESC, updated_at DESC，最多 10 条 |
| 写入 `messages` | ❌ **有意不写** | 避免半成品远端同步污染数据。当前每轮只发 storyContent（已合并的用户+助手文本），不存储独立消息行 |
| 写入 `story_chapters` | ❌ **有意不写** | 当前不生成真正的章节摘要（不调用辅助模型），写入空章节会造成误导。章节摘要须由辅助模型离线生成后再写入 |
| 查询 `messages` | ❌ **有意不查** | retrieve 只查 memory_facts，不组装消息历史 |
| 查询 `story_chapters` | ❌ **有意不查** | retrieve 当前只按 importance/recency 排序取 facts，不做章节范围检索 |
| 辅助模型调用 | ❌ | 不调用任何 LLM |
| pgvector 检索 | ❌ | 不做 embedding |
| Auth / RLS | ❌ | 使用 service_role 绕过 RLS |

**如果后续要接入 messages / story_chapters，必须单独做**：

1. **独立的 Schema migration** — 不修改已有 migration 文件，新增 timestamp-ordered migration。
2. **独立的 API contract 变更** — 更新 `UpdatePayload` / `RetrievePayload` / `UpdateResponse` / `RetrieveResponse` 类型。
3. **独立的测试** — 新增远端契约检查项（`_check_remote_memory_contract.mjs`），验证新表的读写行为。
4. **独立的文档更新** — 更新 `BACKEND_MEMORY_PLAN.md` 和 `supabase/functions/README.md`。
5. **禁止"顺手加"** — 不把 messages/story_chapters 作为其他 PR 的附带改动混入。

**远端契约检查默认不发网络请求**：

`_check_remote_memory_contract.mjs` 默认只做源码静态分析，**不 POST 任何数据到远端**。只有当显式设置环境变量 `RUN_REMOTE_MEMORY_CONTRACT=1` 时，才会向远端 endpoint 发送请求并写入 `contract-*` 前缀的测试数据。这个守卫确保日常开发验证不会意外污染远端数据库。

5. **契约检查脚本** (`_check_remote_memory_contract.mjs`):
   - 新增零依赖 ESM 脚本，用于自动验收远端记忆契约。
   - 默认模式只检查源码（不发网络请求）。
   - 远端模式（`RUN_REMOTE_MEMORY_CONTRACT=1`）直接调用远端 endpoint 验证 round-trip。
   - 详见"验收命令 / 检查项 → 远端记忆契约检查"。

---

## 下一阶段：用户认证与多用户安全

> 当前 Edge Functions 是 **personal/prototype mode**：使用 `SUPABASE_SERVICE_ROLE_KEY` 访问数据库，绕过所有 RLS 策略。
> 这不适合多用户场景。以下是小范围用户 App 上线前必须完成的安全改造。

### 当前认证状态

| 项目 | 当前状态 |
|------|----------|
| JWT 验证（`verify_jwt`） | ❌ **未启用** — 两个 Edge Function 均不检查请求是否携带有效 JWT |
| Supabase Auth | ❌ **未接入** — 前端没有 Supabase 登录/注册流程 |
| RLS（Row Level Security） | ❌ **未启用** — 所有表默认无 RLS 策略，service_role 可全量读写 |
| API Key 存储 | ✅ 仅存用户本地浏览器 — 服务端不保存任何模型 API Key |
| 数据库访问方式 | service_role（`SUPABASE_SERVICE_ROLE_KEY` 环境变量） |

### 为什么不能直接开启 `verify_jwt`

Supabase Edge Function 的 `verify_jwt` 要求请求头携带有效的 Supabase Auth JWT token。如果直接在前端打开 `verify_jwt=true` 但前端尚未接入 Supabase Auth（用户没有登录），**所有请求将被拒绝**，远端记忆功能完全不可用。

正确的顺序必须是：

1. **先**在前端接入 Supabase Auth（`@supabase/supabase-js` 客户端）。
2. **先**实现用户注册/登录流程（email OTP 或 OAuth）。
3. **先**配置 invite-only 注册（防止公开注册）。
4. **然后**在 Edge Function 中启用 `verify_jwt`。
5. **然后**配置 RLS 策略，确保用户只能访问自己的 conversations / story_states / memory_facts。

### 最小安全改造清单（小范围 App 上线前）

| # | 项目 | 说明 |
|----|------|------|
| 1 | 前端接入 Supabase Auth client | 用户通过邮箱 OTP 或 Google OAuth 登录 |
| 2 | invite-only 注册 | Dashboard → Authentication → Settings → 关闭 "Allow new users to sign up"，通过 Dashboard 手动创建用户 |
| 3 | Edge Function 启用 JWT 验证 | 将 `verify_jwt: true` 加入 `config.toml` 或在 Dashboard 中开启 |
| 4 | 从请求头提取 `Authorization: Bearer <jwt>` | Edge Function 中用 `req.headers.get("Authorization")` 获取 token |
| 5 | 用 JWT 中的 `sub`（user_id）作为 `conversations.user_id` | 替换当前无 user_id 的写入方式 |
| 6 | 配置 RLS 策略 | 所有表按 `user_id = auth.uid()` 过滤 |
| 7 | 切换 Edge Function 从 service_role → anon key + JWT | 仅 admin 操作保留 service_role |
| 8 | 收紧 CORS | `Access-Control-Allow-Origin` 从 `*` 改为前端部署域名 |

### API Key 原则不变

无论是否接入 Auth，**模型 API Key 仍然只保存在用户本机**。Edge Function 不代理模型请求，不需要模型 API Key。如果将来需要 Edge Function 调用辅助模型，模型 API Key 通过 Supabase Dashboard → Edge Function Secrets 注入（由项目管理员配置），不从客户端传入。

### 在以上改造完成前

- 远端记忆功能仅适合**单人使用**。
- 所有 conversation 数据在数据库中没有 user_id 隔离，任何能访问 Supabase 项目的人都能看到全部数据。
- 不要部署给多用户使用。不要在生产环境中暴露 Edge Function URL。
