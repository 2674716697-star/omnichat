# Supabase Edge Functions — Memory API

两个 Edge Function 是 Mira 后端记忆层的最小可行实现，**连接真实 Supabase 数据库，不调用辅助模型**。

## 文件

| 文件 | 用途 |
|------|------|
| `memory-update/index.ts` | 接收前端发送的对话内容，写入 conversations / story_states / memory_facts |
| `memory-retrieve/index.ts` | 接收用户当前输入，从 memory_facts 检索并返回记忆文本 |

## 当前状态（2026-06-15）

> **这两个 Edge Function 是 "Phase 2 minimal contract"，不是完整后端记忆系统。** 它们只做最小 DB 写入/检索，不调用辅助模型、不生成章节摘要、不写 messages/story_chapters。

- **memory-update** — 通过 service_role client 连接 Supabase：
  1. 用 `client_conversation_id` 查找或创建 `conversations` 行，获取内部 `uuid id`。新建使用 `INSERT`（非 `upsert`），冲突时 backoff SELECT 后走相同的 auth check / 条件认领逻辑，防止并发覆盖 `user_id`。
  2. Upsert `story_states`（保存 sceneState / storyMemory 快照）。
  3. 将 `storyContent` 的前 1000 字符存入 `memory_facts`（`type='plot_thread'`, `source='remote-update'`）。去重方式：用 `conversationUuid + source + content` 做 SHA-256 生成 deterministic UUID 作为主键，并发写入相同内容时 Postgres 的 23505（unique violation）自然去重，第一个写入胜出。
  4. 不调用任何辅助模型，不做真正的章节摘要。
  5. 输入校验：`conversationId` ≤ 200 字符，`storyContent` 截断至 10000 字符；并发首写 23505 冲突自动 backoff SELECT 重试。
- **memory-retrieve** — 通过 service_role client 连接 Supabase：
  1. 用 `client_conversation_id` 查找 `conversations.id`（不存在则返回空）。
  2. 查询 `status='active'` 的 `memory_facts`，按 `importance DESC, updated_at DESC` 取最多 10 条。
  3. 在字符 budget 内组装 `memoryText`，返回 `selectedFactIds`。
  4. 输入校验：`conversationId` ≤ 200，`userText` 截断至 10000，`budget` clamp 到 [1, 4000]；小 budget 首条截断而非返回空。
- 这两个函数**是真实 DB 最小写入/检索的第一步**。尚不涉及辅助模型、向量检索或章节摘要生成。

### 有意不写的表

| 表 | 状态 | 原因 |
|----|------|------|
| `messages` | ❌ **不写、不查** | 当前每轮只发 `storyContent`（已合并的用户+助手文本），不存储独立消息行。避免半成品远端同步污染数据。 |
| `story_chapters` | ❌ **不写、不查** | 当前不生成真正的章节摘要（不调用辅助模型），写入空章节会造成误导。章节摘要须由辅助模型离线生成后再写入。 |

**如果后续要接入 messages / story_chapters，必须单独做**：独立的 migration、独立的 API contract 变更、独立的测试、独立的文档更新。**禁止作为其他 PR 的附带改动混入。**

### 远端契约检查安全

`_check_remote_memory_contract.mjs` 默认只做源码静态分析，**不 POST 任何数据到远端**。只有当 `RUN_REMOTE_MEMORY_CONTRACT=1` 时才会向远端 endpoint 发送请求并写入 `contract-*` 前缀的测试数据。

## 认证模式

**当前状态：Phase 1.1 —— 可选 Auth 身份识别已实现。**

| 项目 | 状态 |
|------|------|
| Edge Function 验证 JWT | ❌ 未启用（`verify_jwt` 仍关闭） |
| 可选 Auth 身份识别 | ✅ 已实现：请求带 `Authorization: Bearer <token>` 时自动校验并绑定 `user_id` |
| 未登录 personal mode | ✅ 可用：无 `Authorization` header 时，仅读写 `user_id IS NULL` 的 conversation |
| 前端发送 Auth headers | ⚠️ 条件发送：未登录时不发送 `apikey` / `Authorization`，仅 `Content-Type`；登录后才附加 Auth headers |
| 数据库访问方式 | `service_role`（`SUPABASE_SERVICE_ROLE_KEY` 环境变量），绕过所有 RLS |
| RLS 策略 | ❌ 未配置（所有表允许 service_role 全量读写） |

**可选 Auth 身份识别的行为**（Phase 1.1）：

| Authorization header | 行为 |
|---|---|
| **完全不存在** | personal mode：`authUserId=null`，仅读写 `user_id IS NULL` 的行 |
| **存在但格式错误**（非 `Bearer <token>`，或 token 为空） | **401 Unauthorized**（不降级为匿名） |
| **token 无效/过期** | **401 Unauthorized**（不降级为匿名） |
| **token 有效** | 提取 `user.id`，按下面规则访问 conversation |

当一个请求带有**有效的** `Authorization: Bearer <supabase_access_token>` 时：
- `memory-update`：校验 token → 提取 `user.id` → 通过条件更新（`WHERE user_id IS NULL`）认领未归属的 conversation，防止并发覆盖。如果该 conversation 已被其他用户认领，返回 403。
- `memory-retrieve`：校验 token → 提取 `user.id` → 仅返回该用户自己的 conversation 记忆。如果 conversation 属于其他用户，返回 403 或空结果（未登录时返回空结果，避免存在性泄露）。

当请求**不带** `Authorization` header 时（personal mode）：
- 只能访问 `user_id IS NULL` 的 conversation rows。
- 无法读取或覆盖已被某用户认领的 conversation（返回 403 或空结果）。

**未来路线**：Phase 2 将可选开启 `verify_jwt`（强制要求 Auth token），Phase 3 启用 RLS 作为双保险。详见 `BACKEND_MEMORY_PLAN.md`。

**当前安全边界**：
- 函数不返回数据库错误详情（500 只返回 `"Internal server error"`），不泄露 schema 信息。
- 不接收、不存储、不返回任何模型 API Key。
- CORS 当前为 `*`（personal mode 可接受；多用户阶段需收紧）。
- CORS `Access-Control-Allow-Headers` 已包含 `Content-Type, Authorization, apikey`。
- 401/403 响应仅返回 generic error（`"Unauthorized"` / `"Forbidden"`），不泄露用户或数据存在性。

## client_conversation_id 映射策略

前端 `conv.id` 来自 `generateId()`（`Date.now().toString(36) + random`），**不是 UUID**。

数据库设计：
- `conversations.id` — uuid PK，内部使用（deterministic UUID from clientConvId）。
- `conversations.client_conversation_id` — text，存储前端 `conv.id`。
- `idx_conversations_client_conv_id` — 唯一部分索引（`WHERE client_conversation_id != ''`），保证非空值唯一。
- Edge Functions 用 `client_conversation_id` 查找 → 得到 uuid；新建用 `INSERT`（非 upsert），冲突时 backoff SELECT + auth check；用 uuid 做 FK 写入。

## API Key 策略

- 这两个函数**不接收、不存储任何 API Key**。
- Edge Functions 使用 `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` 环境变量（通过 Supabase Dashboard secrets 注入）。
- 前端不传 API Key。将来调用辅助模型时，模型 API Key 也通过 Edge Function secrets 注入。
- 详见 `BACKEND_MEMORY_PLAN.md` § API Key 策略。

## 前端 endpoint 配置

前端 `memoryRemoteEndpoint` 支持三种填法，`buildMemoryEndpointUrl()` 会自动映射到正确的 function 路径：

| 场景 | 填写内容 | 实际请求 URL |
|------|----------|--------------|
| 本地 mock server | `http://localhost:8000` | `http://localhost:8000/api/memory/update` / `…/api/memory/retrieve` |
| 任何 `/functions/v1` base（推荐） | `https://<project-ref>.supabase.co/functions/v1` 或 `http://127.0.0.1:54321/functions/v1` | `<base>/memory-update` / `<base>/memory-retrieve` |
| 具体 function URL | `https://<ref>/functions/v1/memory-update` | 不再追加路径，原样使用 |

**推荐填 `/functions/v1` base URL**：前端会自动把 `/api/memory/update` 映射为 `/memory-update`，把 `/api/memory/retrieve` 映射为 `/memory-retrieve`。不需要为 update 和 retrieve 分别配置不同的 endpoint。

## 部署

```bash
# 需要 Supabase CLI 并已登录
supabase functions deploy memory-update --project-ref <your-ref>
supabase functions deploy memory-retrieve --project-ref <your-ref>

# 设置环境变量（Supabase Dashboard → Project Settings → Edge Functions → Secrets）
# SUPABASE_URL       — 已在 Supabase 环境中自动可用
# SUPABASE_SERVICE_ROLE_KEY — 在 Dashboard → API → service_role key
```

## 数据库 Schema 部署

### 新项目（首次部署，二选一）

**路径 A：Dashboard SQL Editor** — 复制 `supabase/memory_schema.sql` 全文，在 Supabase Dashboard → SQL Editor 中执行。一次包含所有最新结构，简单直接。

**路径 B：Supabase CLI** — `supabase db push` 或 `supabase migration up`，按时间戳顺序执行 `migrations/` 目录下所有 `.sql` 文件。适合需要 migration 版本历史的团队项目。

> **警告：不要混用两条路径到同一个空库。** 先在 SQL Editor 执行 `memory_schema.sql` 再跑 `supabase db push` 会导致 CLI migration 历史表与实际表状态不一致。

### 已有旧 schema 的远程 DB（增量升级）

如果远程 DB 已经执行过旧版 schema（不含 `client_conversation_id`），需要执行增量 migration：

```sql
-- 在 Supabase Dashboard SQL Editor 中执行：
-- supabase/migrations/20260614170000_add_client_conversation_id.sql
```

该 migration 是**幂等**的 — 可安全重复执行。

### user_profiles 表（后端预留，未接前端）

`user_profiles` 表为未来用户登录后填写个人资料预留后端空间。**当前不接前端 UI，不表示登录入口已完成。**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `user_id` | `uuid PK` | — | 未来对应 `auth.users.id`；当前不强制 FK |
| `display_name` | `text` | `''` | 展示名 |
| `bio` | `text` | `''` | 个人简介 |
| `avatar_url` | `text` | `''` | 头像 URL（未来可接 Supabase Storage 或外链） |
| `profile_background_url` | `text` | `''` | 个人资料背景 URL |
| `profile_background_position` | `text` | `'center center'` | 背景 CSS position |
| `profile_theme_json` | `jsonb` | `'{}'` | 主题偏好 |
| `personalization_json` | `jsonb` | `'{}'` | 个性化空间（写作偏好、称呼、阅读偏好、默认角色偏好等） |
| `preferences_json` | `jsonb` | `'{}'` | 通用偏好 |
| `created_at` | `timestamptz` | `now()` | 创建时间 |
| `updated_at` | `timestamptz` | `now()` | 更新时间（自动 trigger） |

**不存储**：模型 API Key、provider secrets、任何密钥。

**JSONB 扩展字段**（2026-06-15 新增）：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `schema_version` | `integer` | `1` | schema 版本号，迁移逻辑按此升级 JSONB 结构 |
| `public_profile_json` | `jsonb` | `'{}'` | 对外可见的资料扩展（标签、社交链接、徽章等） |
| `private_profile_json` | `jsonb` | `'{}'` | 仅自己可见的资料扩展（生日、时区、语言等）。**不能存 API key 或 provider secrets** |
| `ui_state_json` | `jsonb` | `'{}'` | 前端 UI 状态持久化（侧栏折叠、标签页、面板宽度等） |
| `asset_settings_json` | `jsonb` | `'{}'` | 资产呈现参数（头像裁剪坐标、背景滤镜、模糊度等） |

**前端 UI 与 DB 列的绑定原则**：
- 数据库列不应与前端 UI 组件一一绑定。列的职责是提供稳定的查询和索引基础。
- 不稳定的新资料/主题/头像裁剪/背景呈现参数优先进 JSONB 字段（`public_profile_json` / `asset_settings_json` 等）。
- 当某个 JSONB 键被频繁读写且需要索引/约束时，才提升为独立列。
- `private_profile_json` 虽然标记为 "private"（逻辑上仅自己可见），但**不提供加密保证**，**绝对不能存入 API key、provider secret 或任何 access token**。密钥管理走 `BACKEND_MEMORY_PLAN.md` § API Key 策略。

**安全说明**：RLS 策略已预留但注释（`auth.uid() = user_id`），启用 Auth 后用户只能管理自己的 profile。`service_role` 已授权全量读写（供 Edge Functions 使用）。

## 对应前端代码

| 前端 | 函数 |
|------|------|
| `buildMemoryUpdatePayload()` → `POST /api/memory/update` | `memory-update` |
| `buildMemoryRetrievePayload()` → `POST /api/memory/retrieve` | `memory-retrieve` |
| `src/99_legacy_main.js` — `RemoteMemoryAdapter` | 调用方 |

## 文件关系

| 文件 | 用途 |
|------|------|
| `supabase/memory_schema.sql` | **当前完整参考 schema** — 反映所有已生效的结构变更，可用于 Supabase Dashboard SQL Editor 一次性部署新库。修改 schema 时先改这个文件。 |
| `supabase/migrations/20260612130000_create_memory_schema.sql` | **历史基础 migration** — 创建时的初始 schema 快照。**不会**回写后续新增字段（`client_conversation_id`、`user_profiles`、JSONB 扩展列等）。新字段通过后续增量 migration 补齐。原则上不修改此文件。 |
| `supabase/migrations/20260614170000_add_client_conversation_id.sql` | **增量 migration**，给已有 DB 添加 client_conversation_id 列和索引。幂等可重复执行。 |
| `supabase/migrations/20260614171000_grant_service_role_memory_tables.sql` | **权限 migration**，显式授予 service_role 表权限（Edge Functions 需要）。幂等可重复执行。 |
| `supabase/migrations/20260614172000_add_user_profiles.sql` | **增量 migration**，预留 user_profiles 表（未来 Auth 用户资料）。包含该表的 service_role GRANT。幂等可重复执行。 |

**重要：`memory_schema.sql` 与 migrations 的关系**

- `memory_schema.sql` = **当前完整参考 schema**，一次性包含所有最新结构。
- `migrations/*.sql` = **按时间戳顺序的增量执行源**。旧的 base migration 是历史快照，不随 `memory_schema.sql` 回写。
- 新项目部署**二选一**：A) SQL Editor 执行 `memory_schema.sql`；B) Supabase CLI 按 migrations 全量执行。**不要混用到同一个空库** — CLI 不会感知 SQL Editor 已执行过的 DDL，会导致 migration 历史表状态不一致。

**Migration 顺序规则**：Supabase CLI 按文件名时间戳顺序执行 migrations。每个 migration 只能引用在该时间戳之前已创建的表，不得引用未来 migration 才创建的表。因此 `20260614171000` 不包含 `user_profiles` 的 GRANT（该表在 `20260614172000` 才创建）；`user_profiles` 的权限授予在 `20260614172000` 内部完成。

**当前阶段约束**：不部署至生产、不启用 Supabase Auth / RLS、不做 profile API。user_profiles 表仅为后端预留，不接前端 UI。

## 本地临时文件

`supabase/.temp/` 是 Supabase CLI (`supabase link`) 的本地临时目录，包含 `project-ref`、`linked-project.json`、`cli-latest` 等文件。此目录**不提交到 Git**，已在 `.gitignore` 中忽略。

## 提交/推送前安全检查

每次提交或推送前，确认以下事项（部分已自动化到 `_check_stability.mjs` 和 `_check_remote_memory_contract.mjs`）：

### supabase/.temp/ 永远不提交

- 已在 `.gitignore` 中忽略。`git ls-files supabase/.temp` 应返回空。

### service_role key / SUPABASE_SERVICE_ROLE_KEY 永远不提交

- `SUPABASE_SERVICE_ROLE_KEY` 只存在于 Supabase Dashboard → Edge Function Secrets 中，通过 `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` 读取。
- 仓库中的 `SUPABASE_SERVICE_ROLE_KEY` 引用（如 `Deno.env.get(...)`）是安全的 — 这是读取环境变量名，不是真实密钥。
- **任何 `SUPABASE_SERVICE_ROLE_KEY=eyJ...` 或 `=sb_...` 形式的真实密钥赋值绝对不能出现。**
- 如果密钥曾经提交过：在 Supabase Dashboard 中 rotate key → 旧 key 失效 → 更新 Edge Function secrets。

### 模型 API Key 永远不提交

- 模型 API Key 只保存在用户本地浏览器存储中。绝不在仓库任何文件中出现。

### publishable key 和 project URL

- **publishable key（anon key）不是 secret** — 浏览器网络请求中即可获取。
- **但是**，公开仓库会使 project URL 和 publishable key 永久进入 git history。
- 私有仓库风险较低，可直接 push。
- 公开仓库 push 前必须接受：project URL / publishable key 将永久公开暴露，任何人可通过 git history 找到并使用它们访问你的 Supabase 项目。

### 远端 contract 测试

- `_check_remote_memory_contract.mjs` 默认只做源码静态分析，**不发送任何网络请求**。
- 需要验证远端 round-trip 时，显式设置 `RUN_REMOTE_MEMORY_CONTRACT=1`，此时会写入 `contract-*` 测试数据。
- 不要在 CI 中默认开启远端模式（除非远端是 staging 环境）。

### 自动化检查

```powershell
node _check_release_readiness.mjs       # ★ 只读汇总检查 — 分组未提交改动，集中提示 secret/Supabase/远端测试风险
node _check_stability.mjs               # secret hygiene + gitignore + git tracking
node _check_remote_memory_contract.mjs  # secret hygiene + pre-commit hygiene
```

- **`_check_release_readiness.mjs` 是只读脚本**：不会 stage、commit、push，不会发送网络请求。它只汇总当前未提交改动并按路径分组（Frontend/UI、Backend/Supabase、Checks/Docs、Other/Unknown），帮助用户决定是否需要拆提交；同时集中检查 secret 泄露、Supabase 默认值暴露风险和远端测试环境变量。
