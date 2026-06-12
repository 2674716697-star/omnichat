# Mira 后端记忆计划

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


# 下一步执行清单（本地草案，不推送）

> **状态**: 草案阶段。以下所有步骤都在本地执行，不推送、不部署、不接真实数据库。
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

### P0.2 确认后端文件不入 Git

当前 `git status` 应显示：

```
?? BACKEND_MEMORY_PLAN.md
?? supabase/
```

两个路径均为 untracked，不应出现在任何 commit 中。**永远不要** `git add BACKEND_MEMORY_PLAN.md` 或 `git add supabase/`。

如果将来需要共享这些文件给其他开发者，建议：
- 单独开一个私有分支 `draft/backend-memory`。
- 或者在 `.gitignore` 中显式忽略（但当前不强制）。

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

CLI 会自动执行 `supabase/migrations/` 目录下的 migration 文件。当前 migration 文件：
- `supabase/migrations/20260612130000_create_memory_schema.sql`
  - 内容从 `supabase/memory_schema.sql` 复制，源头仍是 `memory_schema.sql`。
  - 修改 schema 时**两边要同步更新**。
  - 文件头部有注释说明 mirror 关系。

#### 当前环境限制

| 命令 | 是否可用 | 原因 |
|------|----------|------|
| `supabase db push`（远程） | ✅ 可用 | 需要 `supabase login` + `supabase link --project-ref <ref>`，不依赖本地 Docker |
| `supabase db push`（本地） | ❌ 阻塞 | 依赖本地 Docker engine + WSL 2，当前未就绪（见"环境阻塞条件"） |
| `supabase migration up`（本地） | ❌ 阻塞 | 同上 |

**结论**：Schema 部署当前可通过 Dashboard SQL Editor（方式 A）或远程 `supabase db push`（方式 B）完成。本地 `supabase start` / 本地 `supabase db push` 因 Docker/WSL 阻塞暂不可用，但不影响远程部署。

**验证**:
- 所有 5 张表创建成功（`conversations`, `messages`, `story_states`, `story_chapters`, `memory_facts`）。
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
| 4 | **把后端草案 push 到远程仓库** | 包括 `BACKEND_MEMORY_PLAN.md`、`supabase/` 目录及其中所有文件。这些文件只存在于本地工作区。 |
| 5 | **在 schema 或函数中硬编码 API Key / 密码** | 即使是注释掉的示例代码也不行。不要在任何地方留下真实的 key 字符串。 |
| 6 | **修改前端 src/script.js / index.html / omnichat.html** | 草案阶段不改前端代码。所有后端验证通过 curl 或独立测试页面完成。 |
| 7 | **在 Supabase 项目中启用 RLS 但未配置 Auth** | 会导致所有请求被拒绝，难以排查。Personal mode 先不开 RLS，等有账号系统后再配。 |
| 8 | **把 service_role key 写入本地文件或环境变量** | service_role key 可以跳过 RLS，泄露后果严重。本地开发用 anon key 足够；service_role 只通过 Supabase Dashboard secrets 注入。 |

---

## 验收命令 / 检查项

在完成每个 Phase 后，运行以下检查：

### 每次验证前必查

```powershell
# 1. 确认后端文件未进入 Git
git status --short
# 期望输出只包含:
#   ?? BACKEND_MEMORY_PLAN.md
#   ?? supabase/

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
**影响**: 任何网站都可以向函数发送请求（虽然后端只返回空 ack，不暴露数据）。
**缓解**: P2 部署后，将 `*` 改为具体域名（如 `https://localhost:5500` 或部署后的前端域名）。此修改应在 P2.4 远程 curl 验证通过后执行。

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
