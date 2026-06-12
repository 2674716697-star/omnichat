# Supabase Edge Functions — Memory API (Draft)

这两个 Edge Function 是 Mira 后端记忆层的原型草稿，**尚未连接数据库或模型**。

## 文件

| 文件 | 用途 |
|------|------|
| `memory-update/index.ts` | 接收前端发送的对话内容，后续将调用辅助模型生成章节摘要和记忆事实 |
| `memory-retrieve/index.ts` | 接收用户当前输入，后续将检索相关章节和记忆事实并返回记忆文本 |

## 当前状态

- **memory-update** — 只做请求校验和 ack 返回（`chapters: [], pinnedFacts: [], unresolvedThreads: []`），不写入任何数据。
- **memory-retrieve** — 只做请求校验和空结果返回（`memoryText: '', selectedChapterIds: [], selectedFactIds: []`），不查询数据库。
- 这两个函数**不能提升记忆效果**。它们只提供正确的 HTTP 协议和 JSON schema，方便前端切换 `memoryMode: 'remote'` 后不报错。
- 等数据库逻辑（Supabase client + 模型调用 + pgvector 检索）实现后，这两个函数才有实际作用。

## API Key 策略

- 这两个函数**不接收、不存储任何 API Key**。
- API Key 管理保持本地（见 `BACKEND_MEMORY_PLAN.md` § API Key 策略）。
- 函数内部需要调用模型时，API Key 通过 Supabase Edge Function secrets 注入（`Deno.env.get("...")`），不会由前端传入。

## 前端 endpoint 配置

前端 `memoryRemoteEndpoint` 支持三种填法，`buildMemoryEndpointUrl()` 会自动映射到正确的 function 路径：

| 场景 | 填写内容 | 实际请求 URL |
|------|----------|--------------|
| 本地 mock server | `http://localhost:8000` | `http://localhost:8000/api/memory/update` / `…/api/memory/retrieve` |
| 任何 `/functions/v1` base（推荐） | `https://<project-ref>.supabase.co/functions/v1` 或 `http://127.0.0.1:54321/functions/v1` | `<base>/memory-update` / `<base>/memory-retrieve` |
| 具体 function URL | `https://<ref>/functions/v1/memory-update` | 不再追加路径，原样使用 |

**推荐填 `/functions/v1` base URL**：前端会自动把 `/api/memory/update` 映射为 `/memory-update`，把 `/api/memory/retrieve` 映射为 `/memory-retrieve`。不需要为 update 和 retrieve 分别配置不同的 endpoint。

如果填具体 function URL（如 `…/memory-update`），前端检测到 URL 已指向具体函数后会原样使用、不追加任何路径。但此时 retrieve 请求仍会走同一个 URL（除非前端后续支持独立的 retrieve endpoint 配置）。

## 部署（未来）

```bash
# 需要 Supabase CLI 并已登录
supabase functions deploy memory-update --project-ref <your-ref>
supabase functions deploy memory-retrieve --project-ref <your-ref>
```

## 对应前端代码

| 前端 | 函数 |
|------|------|
| `buildMemoryUpdatePayload()` → `POST /api/memory/update` | `memory-update` |
| `buildMemoryRetrievePayload()` → `POST /api/memory/retrieve` | `memory-retrieve` |
| `src/99_legacy_main.js` — `RemoteMemoryAdapter` | 调用方 |

## 数据库 Schema 部署

这两个函数依赖 `memory_schema.sql` 定义的表结构（`conversations`, `messages`, `story_states`, `story_chapters`, `memory_facts`）。Schema 部署有两种方式：

### 方式 A：Dashboard SQL Editor（推荐）

在 Supabase Dashboard → SQL Editor 中粘贴 `supabase/memory_schema.sql` 全文并执行。

### 方式 B：Supabase CLI migration

```bash
# 前置条件：已 supabase login + supabase link
supabase db push
```

CLI 自动执行 `supabase/migrations/` 目录下的文件。当前 migration：
- `supabase/migrations/20260612130000_create_memory_schema.sql`

### 文件关系

| 文件 | 用途 |
|------|------|
| `supabase/memory_schema.sql` | **可读 schema 草案**，是 schema 的权威源头。修改 schema 时先改这个文件。 |
| `supabase/migrations/*.sql` | **CLI migration 镜像**，内容从 `memory_schema.sql` 复制。修改 schema 时两边要同步。 |

**注意**：当前阶段这两个函数是空 stub（只返回 ack / 空结果），不查询也不写入数据库。等数据库逻辑实现后，函数才会读写上述表。
