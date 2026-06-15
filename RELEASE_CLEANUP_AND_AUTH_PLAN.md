# Mira 发布整理与 Profile/Auth 设计计划

> **状态**: 本地设计快照，未部署，未 push。
> **日期**: 2026-06-15
> **性质**: 文档计划 + 设计草稿，不修改任何 JS/TS/SQL/HTML/CSS 文件。

---

## 1. 当前未提交改动清单

根据 `_check_release_readiness.mjs` 的分组逻辑整理（2026-06-15 `git status --short` 快照）：

### 1.1 Frontend/UI（5 个文件）

| 文件 | 状态 | 说明 |
|------|------|------|
| `index.html` | M | 桌面入口页，含 Supabase URL / publishable key 默认值 |
| `omnichat.html` | M | 移动端入口页，含 Supabase URL / publishable key 默认值 |
| `script.js` | M | 主逻辑：RemoteMemoryAdapter、runtime config、memory prefetch、v6→v7 migration |
| `src/04_migration.js` | M | 存储迁移逻辑（v6→v7 memoryMode/remoteMemoryCache 标准化） |
| `src/99_legacy_main.js` | M | 遗留入口/初始化逻辑 |

**代表内容**: 前端 RemoteMemoryAdapter 接入、runtime config 注入、记忆缓存 prefetch、v6→v7 平滑迁移、Supabase URL/key 默认值。

### 1.2 Backend/Supabase（9 个文件）

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/01_constants.js` | M | Supabase URL / publishable key 默认值 |
| `supabase/functions/README.md` | M | Edge Function 文档更新（Phase 2 minimal contract + Phase 1.1 可选 Auth） |
| `supabase/functions/memory-retrieve/index.ts` | M | 远端记忆检索：conversation 查找 + memory_facts 查询 |
| `supabase/functions/memory-update/index.ts` | M | 远端记忆写入：conversation 创建/认领 + story_states upsert + memory_fact 写入 |
| `supabase/memory_schema.sql` | M | 完整参考 schema：新增 client_conversation_id、user_profiles、JSONB 扩展列 |
| `supabase/migrations/20260612130000_create_memory_schema.sql` | M | 历史基础 migration（仅更新注释，不改变结构） |
| `supabase/migrations/20260614170000_add_client_conversation_id.sql` | ?? | 新增增量 migration：client_conversation_id 列 + 唯一索引 |
| `supabase/migrations/20260614171000_grant_service_role_memory_tables.sql` | ?? | 新增增量 migration：显式授予 service_role 表权限 |
| `supabase/migrations/20260614172000_add_user_profiles.sql` | ?? | 新增增量 migration：user_profiles 表 + 权限 |

**代表内容**: Phase 2 minimal contract Edge Functions（真实 DB 写入/检索，不调辅助模型）、schema/migration 增量变更、可选 Auth 身份识别（Phase 1.1）、user_profiles 表预留。

### 1.3 Checks/Docs（6 个文件）

| 文件 | 状态 | 说明 |
|------|------|------|
| `.gitignore` | M | 新增 supabase/.temp/ 忽略规则 |
| `BACKEND_MEMORY_PLAN.md` | M | 后端记忆计划：状态快照、验证结果、实施进度、下一步建议 |
| `_build_script.js` | M | 构建脚本更新 |
| `_check_stability.mjs` | M | 稳定性检查：新增 Phase 1/1.1/1.2 + Remote Memory/Auth Safety + 12 大类检查 |
| `_check_release_readiness.mjs` | ?? | 新增只读预提交检查脚本：未提交改动分组、secret 扫描、Supabase 默认值暴露检查 |
| `_check_remote_memory_contract.mjs` | ?? | 新增远端记忆契约检查脚本：源码静态分析 + 可选远端 round-trip 验证 |

**代表内容**: 安全卫生自动化检查、契约验证、文档同步、构建辅助。

### 1.4 推荐 commit 拆分顺序

按依赖关系从底向上拆分，每个 commit 可独立通过 `_check_stability.mjs` 和 `_check_release_readiness.mjs`：

| 顺序 | Commit | 包含文件 | 说明 |
|------|--------|----------|------|
| 1 | **Backend schema + 最小记忆契约** | `memory_schema.sql`、4 个 migration 文件、`memory-update/index.ts`、`memory-retrieve/index.ts`、`supabase/functions/README.md`、`src/01_constants.js` | 数据库结构 + Edge Function 逻辑 + 文档。无前端依赖。 |
| 2 | **前端 RemoteMemoryAdapter 接入** | `script.js`、`src/04_migration.js`、`src/99_legacy_main.js`、`index.html`、`omnichat.html` | 前端记忆远程化 + v6→v7 migration。依赖 commit 1 的 Edge Function 契约。 |
| 3 | **安全检查脚本 + 文档** | `_check_release_readiness.mjs`、`_check_remote_memory_contract.mjs`、`_check_stability.mjs`、`_build_script.js`、`.gitignore`、`BACKEND_MEMORY_PLAN.md` | 辅助工具链和文档。依赖前两个 commit 的源码存在。 |

**每个 commit 前必须运行**:
```powershell
node _check_stability.mjs
node _check_release_readiness.mjs
```

---

## 2. 发布清理路径 A（commit 拆分）

> **目标**: 不实现新功能，只整理快照时的 20 个未提交改动（按 _check_release_readiness.mjs 分组），按功能拆分为 3 个独立 commit。本文档本身为额外的计划产物，不计入该分组。

### Commit 1: Backend schema + Phase 2 minimal contract

- `supabase/memory_schema.sql` — 当前完整参考 schema（含 client_conversation_id、user_profiles、JSONB 扩展列）
- `supabase/migrations/20260612130000_create_memory_schema.sql` — 历史基础 migration（仅注释更新）
- `supabase/migrations/20260614170000_add_client_conversation_id.sql` — 增量：client_conversation_id
- `supabase/migrations/20260614171000_grant_service_role_memory_tables.sql` — 增量：service_role 权限
- `supabase/migrations/20260614172000_add_user_profiles.sql` — 增量：user_profiles 表
- `supabase/functions/memory-update/index.ts` — 最小写入（conversations + story_states + memory_facts）
- `supabase/functions/memory-retrieve/index.ts` — 最小检索（conversation 查找 + memory_facts 查询）
- `supabase/functions/README.md` — 文档同步
- `src/01_constants.js` — Supabase URL / publishable key 默认值

**验收**: Deno check 通过、`_check_stability.mjs` PASS、`_check_remote_memory_contract.mjs` PASS（默认模式）。

**注意**: 此 commit 包含 Supabase URL / publishable key 默认值。push 到公开仓库前必须接受永久暴露风险（见下文风险矩阵 §3.1）。

### Commit 2: Frontend RemoteMemoryAdapter + v6→v7 migration

- `script.js` — RemoteMemoryAdapter、runtime config、prefetch、buildRemoteMemoryHeaders、v6→v7 migration
- `src/04_migration.js` — v6→v7 迁移逻辑
- `src/99_legacy_main.js` — 初始化调整
- `index.html` — Supabase URL / publishable key 默认值
- `omnichat.html` — Supabase URL / publishable key 默认值

**验收**: `node --check script.js` PASS、`_check_stability.mjs` PASS、浏览器 smoke test（chat 正常流式回复）。

### Commit 3: 安全检查脚本 + 文档

- `_check_release_readiness.mjs` — 只读预提交检查
- `_check_remote_memory_contract.mjs` — 远端契约检查
- `_check_stability.mjs` — 稳定性检查（已有修改并入）
- `_build_script.js` — 构建脚本
- `.gitignore` — supabase/.temp/ 忽略
- `BACKEND_MEMORY_PLAN.md` — 计划文档更新

**验收**: 所有三个检查脚本 PASS、`git ls-files supabase/.temp` 返回空。

---

## 3. 设计路径 B：Profile/Auth/RLS 架构

> **性质**: 纯设计文档，不包含任何实现代码。所有决策需评审通过后才能进入 implementation。

### 3.1 Auth 模式

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 注册模式 | **invite-only**（仅管理员在 Dashboard 手动创建用户） | 小范围用户（< 50 人），避免公开注册带来的滥用/spam/合规成本 |
| 登录方式 | **Email OTP 优先**（passwordless magic link） | 免密码管理、用户体验流畅、Supabase 原生支持 |
| OAuth | **可选后期加入**（Google / GitHub） | 初期不需要，降低复杂度；Supabase Auth 支持随时启用新 provider |
| 前端 Auth SDK | `@supabase/supabase-js` v2 客户端 `signInWithOtp` | 与现有 supabase client 复用依赖 |

### 3.2 用户身份映射

```
Supabase Auth (auth.users)
  └── user_id (uuid) ────────────────────────┐
                                              │
  user_profiles.user_id (uuid PK) ───────────┘  (1:1，未来加 FK)
  conversations.user_id (uuid, nullable) ──────┘  (1:N，当前 nullable 兼容 personal mode)
  story_states ──(via conversation FK)───────┘
  memory_facts ──(via conversation FK)────────┘
  story_chapters ──(via conversation FK)─────┘
  messages ──(via conversation FK)────────────┘
```

**过渡期兼容**:
- `conversations.user_id` 保持 nullable。
- 未登录用户创建的 conversation 的 `user_id IS NULL`。
- 用户登录后，通过 `resolveConversationOwnership`（已实现在 memory-update 中）认领 `user_id IS NULL` 的旧 conversation。
- 认领条件：`client_conversation_id` 匹配 + `user_id IS NULL` → UPDATE `user_id = auth.uid()`。

### 3.3 Edge Function 认证过渡

当前 Phase 1.1 已实现**可选 Auth 身份识别**：

| Authorization header | 行为 |
|----------------------|------|
| 完全不存在 | personal mode：`authUserId=null`，仅读写 `user_id IS NULL` 的行 |
| 存在但格式错误（非 `Bearer <token>`，或 token 为空） | **401 Unauthorized**（不降级） |
| 有效 JWT | 校验通过：`authUserId = token.sub`，仅读写 `user_id = authUserId` 的行 |

**从 personal mode 到 authenticated mode 的过渡步骤**:

1. **前端接入 Supabase Auth** — 用户完成 Email OTP 登录，获取 JWT。
2. **前端在 memory fetch 时附带 `Authorization: Bearer <jwt>`**（已由 `buildRemoteMemoryHeaders` 条件发送实现）。
3. **Edge Function 识别 JWT** — `getOptionalAuthUserId` 已实现，无需改 Edge Function。
4. **旧 conversation 认领** — 用户首次登录后，`resolveConversationOwnership`（已实现）自动将 `user_id IS NULL` 的旧 conversation 绑定到当前 user_id。
5. **开启 RLS** — 在所有表上启用 RLS + `auth.uid() = user_id` 策略。
6. **收紧 CORS** — `Access-Control-Allow-Origin` 从 `*` 改为前端部署域名。
7. **切换为 anon key + JWT** — Edge Function 从 service_role 切换为 anon key + 用户 JWT 访问数据库。
8. **仅 admin 操作保留 service_role**（如数据迁移、全局统计）。

### 3.4 RLS 策略设计（高层）

RLS 策略在 `memory_schema.sql` 中已注释预留。启用时取消注释：

| 表 | 策略 | USING / WITH CHECK |
|----|------|--------------------|
| `conversations` | 用户管理自己的会话 | `auth.uid() = user_id` |
| `messages` | 用户管理自己会话中的消息 | `auth.uid() = (SELECT c.user_id FROM conversations c WHERE c.id = messages.conversation_id)` |
| `story_states` | 用户管理自己会话的故事状态 | 同上（通过 conversation_id） |
| `story_chapters` | 用户管理自己会话的章节 | 同上 |
| `memory_facts` | 用户管理自己会话的记忆事实 | 同上 |
| `user_profiles` | 用户只能读写自己的资料 | `auth.uid() = user_id`；可额外加"其他用户可读 display_name + avatar_url"策略 |

**启用 RLS 的前置条件**:
- Supabase Auth 已配置（invite-only）。
- 所有 INSERT/UPDATE 必须正确填充 `user_id = auth.uid()`。
- `conversations.user_id` 不再有 NULL 行（所有旧 conversation 已认领或确认废弃）。
- 通过 `_check_remote_memory_contract.mjs` 远端模式验证 RLS 正确隔离。

### 3.5 Storage 设计（头像 / 个人资料背景）

**Bucket 规划**:

| Bucket 名 | 用途 | 公开可读 | 大小限制 | 文件类型 |
|-----------|------|----------|----------|----------|
| `avatars` | 用户头像 | 是（`public`） | 2 MB | `image/png`, `image/jpeg`, `image/webp` |
| `profile-backgrounds` | 个人资料背景 | 是（`public`） | 5 MB | `image/png`, `image/jpeg`, `image/webp` |

**路径约定**:
```
avatars/<user_id>/avatar.<ext>
profile-backgrounds/<user_id>/background.<ext>
```

**上传策略**:
- 每个用户每个 bucket 只保留最新一个文件（覆盖上传）。
- 上传时自动生成缩略图（未来可选，当前不实现）。
- 前端用 Supabase Storage SDK 直接从浏览器上传，不经过 Edge Function。

**Storage RLS**:
```sql
-- avatars bucket: 公开读，所有者写
CREATE POLICY "avatars public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars owner insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

CREATE POLICY "avatars owner update/delete"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND owner = auth.uid());
-- profile-backgrounds 同理
```

**URL 存储**: 上传成功后，将 Storage 公开 URL 写入 `user_profiles.avatar_url` 和 `user_profiles.profile_background_url`。

**asset_settings_json**（`user_profiles`）存储资产呈现参数：
```json
{
  "avatar": {
    "crop_x": 0, "crop_y": 0, "crop_w": 200, "crop_h": 200,
    "rotation": 0, "scale": 1
  },
  "background": {
    "filter": "none", "blur": 0, "brightness": 1, "position": "center center"
  }
}
```

### 3.6 CORS / JWT 过渡

**当前状态**: 两个 Edge Function 均为 `Access-Control-Allow-Origin: *`，`verify_jwt` 关闭。

**过渡原则**: 只在**前端完成 Auth 接入并通过 smoke test** 后才收紧 CORS 和启用 `verify_jwt`。

| 步骤 | 操作 | 前置条件 |
|------|------|----------|
| 1 | CORS 保持 `*` | 无需改变（当前 personal/transition 阶段） |
| 2 | 前端 Auth 登录流程实现 | Supabase Auth 配置完成 |
| 3 | 前端条件发送 JWT | `buildRemoteMemoryHeaders` 在登录后附带 Authorization |
| 4 | Edge Function 验证 JWT | `getOptionalAuthUserId` 已实现，无请求头变化 |
| 5 | CORS 改为具体域名 | 确认 Auth 流程无问题、所有用户已迁移 |
| 6 | 开启 `verify_jwt`（Supabase Dashboard） | CORS 已收紧 |

**错误顺序的风险**:
- 先开 `verify_jwt` 但前端未登录 → 所有请求被拒，远端记忆完全不可用。
- 先收紧 CORS 但仍有用户用旧域名 → 跨域请求被浏览器拦截。
- 先后端改但前端未适配 → 现有 personal mode 用户被锁。

### 3.7 API Key 规则（重申）

> **模型 API Key 绝不存入 user_profiles 的任何 JSONB 字段或任何后端列。**

- API Key 只存用户本地浏览器（localStorage / IndexedDB）。
- 前端发送给模型时直接使用本地 Key，不经过 Edge Function。
- 如果未来 Edge Function 需要调用辅助模型（如章节摘要生成），Key 通过 Supabase Dashboard → Edge Function Secrets 注入（项目管理员配置），不由前端传入。
- `private_profile_json` 名中的 "private" 是**逻辑层面**的"仅自己可见"，不提供加密保证。禁止将密钥存于此字段。

---

## 4. Migration 策略

### 4.1 核心原则

1. **绝不编辑已应用的 migration 文件以添加新功能** — 已应用的 migration 是历史记录，代表某个时间点的 schema 快照。新结构变更必须新增 timestamp-ordered migration。
2. **`supabase/memory_schema.sql` 保持为当前完整参考 schema** — 每次结构变更后立即更新，反映所有已生效的表/列/索引/触发器。新库部署时可直接执行此文件（路径 A），或通过 CLI 按时间戳执行 migrations（路径 B），**二选一，不混用**。
3. **Migration 时间戳顺序检查** — 每次新增 migration 后运行 `_check_stability.mjs` 验证：所有 migration 只引用当前或之前的表，不引用未来表。
4. **新 migration 只在设计评审通过后添加** — 不提前创建空 migration。

### 4.2 Migration 添加流程

```
设计评审通过 → 确定变更范围 → 更新 memory_schema.sql（完整 schema）
  → 创建 timestamped migration SQL → 运行 _check_stability.mjs
  → 确认 migration 顺序正确 → commit
```

### 4.3 当前 migration 文件清单

| 文件名 | 用途 | 可否修改 |
|--------|------|----------|
| `20260612130000_create_memory_schema.sql` | 历史基础 migration | 仅注释修正，不改变 DDL |
| `20260614170000_add_client_conversation_id.sql` | 增量：client_conversation_id | 不修改（已应用后不可变） |
| `20260614171000_grant_service_role_memory_tables.sql` | 增量：service_role 权限 | 不修改 |
| `20260614172000_add_user_profiles.sql` | 增量：user_profiles 表 | 不修改 |

**未来 Auth/RLS 新增 migration 示例**:
- `20260616XXXXXX_enable_rls_policies.sql` — 启用所有表 RLS + 创建策略
- `20260616XXXXXX_add_user_profiles_fk.sql` — user_profiles.user_id → auth.users.id FK

---

## 5. 风险矩阵

| # | 风险 | 严重度 | 影响范围 | 缓解措施 |
|----|------|--------|----------|----------|
| **R1** | **公开仓库 + 无 Auth/RLS → 数据暴露** | 🔴 严重 | 所有 conversation 数据可被任何人通过 Supabase API 读写 | ① 当前阶段只 push 到私有仓库；② 公开前必须完成 Auth + RLS 改造；③ 在 `_check_release_readiness.mjs` 中持续 warn |
| **R2** | **破坏现有 anonymous/local-first 使用** | 🔴 严重 | 现有 personal mode 用户无法继续使用 | ① `conversations.user_id` 保持 nullable；② `getOptionalAuthUserId` 在无 JWT 时返回 null，行为不变；③ 每次改动后浏览器 smoke test |
| **R3** | **verify_jwt 过早启用 → 用户被锁** | 🔴 严重 | 所有未登录用户的远端记忆请求被拒 | ① 按 §3.6 的顺序严格执行，不跳步；② 前端 Auth 登录流程完成并测试通过后才在 Dashboard 开启 verify_jwt |
| **R4** | **Profile JSONB 无 schema_version 管控 → 结构混乱** | 🟡 中等 | 前端/后端对 JSONB 字段结构认知不一致，读取失败 | ① `user_profiles.schema_version` 已预留，默认 1；② 前端/后端读取时检查版本号，按需执行 JSONB 结构升级；③ 每个 JSONB 字段独立版本（未来可细化） |
| **R5** | **Storage 公开上传无限制 → 滥用/成本膨胀** | 🟡 中等 | 公开 bucket 可被上传任意文件，消耗存储和带宽 | ① RLS 策略限制 INSERT 仅为 owner = auth.uid()；② bucket 级别设置文件大小上限（2MB / 5MB）；③ 禁止 public INSERT（未来可加 rate limit 或 invite-only 检查） |
| **R6** | **主回复流式被 Auth/Profile 调用阻塞** | 🟡 中等 | 聊天回复变慢，用户体验下降 | ① Auth token 刷新 / profile 读取在后台异步完成；② 不使用 `await getUserProfile()` 阻塞流式回复；③ prefetch 模式：内存检索和 profile 一起 prefetch，下一轮享用 |
| **R7** | **Supabase URL / publishable key 永久进入公开 git history** | 🟡 中等 | 任何人都知道 project URL + anon key，可绕过前端直接调用 API | ① 当前只 push 私有仓库；② 公开前改为 runtime config 注入（window.__MIRA_CONFIG__ 已支持）；③ 或接受暴露风险（publishable key 本就不是 secret） |
| **R8** | **R2: CORS `*` + 无 Auth → 任意网站可调用 Edge Function** | 🟢 低（当前阶段） | 垃圾写入（需知道有效 client_conversation_id） | 当前 personal/prototype 阶段可接受；接入 Auth 后收紧 CORS |
| **R9** | **R4: 无记忆去重 → 重复事实写入** | 🟢 低 | 浪费存储 + 检索预算 | memory-update 已实现 deterministic UUID 去重；P3 阶段加 content_hash 唯一索引 |
| **R10** | **迁移时 `conversations.user_id` NULL 行被 RLS 过滤** | 🟡 中等 | 开启 RLS 后旧 conversation 不可见 | 开启 RLS 前必须执行数据迁移脚本：所有 `user_id IS NULL` 的行 → 绑定到对应的 owner（或确认废弃）；或 RLS 策略临时允许 `user_id IS NULL` |

---

## 6. 实现前验收标准

以下标准必须在**任何 Auth/Profile/RLS 实现代码**开始编写前全部通过：

### 6.1 自动化检查

| # | 检查项 | 命令 | 期望结果 |
|----|--------|------|----------|
| 1 | script.js 语法有效 | `node --check script.js` | PASS |
| 2 | omnichat.html inline script 语法有效 | `node --check` + 提取 | PASS |
| 3 | 稳定性检查完整通过 | `node _check_stability.mjs` | PASS（exit 0） |
| 4 | 发布就绪检查通过（或仅 WARN） | `node _check_release_readiness.mjs` | PASS 或 PASS WITH WARNINGS |
| 5 | 远端契约检查通过（默认模式） | `node _check_remote_memory_contract.mjs` | PASS（exit 0） |
| 6 | Deno Edge Function 类型检查 | `deno check supabase/functions/memory-update/index.ts` + `deno check supabase/functions/memory-retrieve/index.ts` | PASS |

### 6.2 行为检查

| # | 检查项 | 验证方式 | 期望结果 |
|----|--------|----------|----------|
| 7 | 远端记忆不阻塞主回复 | 浏览器聊天 5+ 轮，观察流式速度 | 开启/关闭远端记忆时流式速度差异 < 200ms |
| 8 | 远端记忆失败静默回退 | 关闭 Supabase 项目后再聊天 | 无 toast、无异常、正常使用本地 storyMemory |
| 9 | 本地 settings / API key 不被重置 | 清除远端记忆配置后检查 localStorage | provider、model、apiKey 等设置保持不变 |
| 10 | service_role / model key 不在源码中 | `_check_release_readiness.mjs` secret scan | 所有 hard secret 检查 PASS |
| 11 | 浏览器 smoke test chat 正常 | 打开 index.html / omnichat.html → 发送消息 → 等待流式回复 → 检查 A/B/C/D 选项 | 全部正常 |

### 6.3 文档检查

| # | 检查项 | 期望结果 |
|----|--------|----------|
| 12 | `RELEASE_CLEANUP_AND_AUTH_PLAN.md` 存在且内容完整 | 已创建，包含全部 6 个必要章节 |
| 13 | `BACKEND_MEMORY_PLAN.md` 包含指向本文档的引用 | 见本文末尾 |
| 14 | 文档不声称已实现任何未部署功能 | 所有 Auth/RLS/Storage 功能标注为"设计阶段" |

---

## 7. 附录：与 BACKEND_MEMORY_PLAN.md 的关系

- `BACKEND_MEMORY_PLAN.md` — 后端记忆架构的长期设计文档，涵盖 schema、检索策略、实施阶段。
- `RELEASE_CLEANUP_AND_AUTH_PLAN.md`（本文档）— 聚焦当前未提交改动的整理方案 + Profile/Auth 设计。
- 两个文档互补，本文档的部分内容（如 migration 策略、API Key 原则）直接引用自 `BACKEND_MEMORY_PLAN.md`，确保一致性。
- 本文档中的 Auth/RLS/Storage 设计是 `BACKEND_MEMORY_PLAN.md` 中"下一阶段：用户认证与多用户安全"章节的详细展开。
