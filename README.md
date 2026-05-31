# OmniChat

iOS 移动端优先的多模型 AI 聊天网页客户端。支持 OpenAI、xAI / Grok、DeepSeek、OpenRouter、Groq、Moonshot (Kimi)、智谱 GLM、SiliconFlow，流式输出，完整多轮上下文，历史会话管理，世界故事写作模式。

## 功能

- 支持 OpenAI / xAI / DeepSeek / OpenRouter / Groq / Moonshot / 智谱 / SiliconFlow 八大服务商
- 自动获取 API Key 对应的可用模型列表
- 流式输出（SSE），逐字显示
- 完整多轮上下文，不压缩、不截断
- 多会话历史管理，支持搜索、重命名、删除
- System Prompt、Temperature、Top P、Max Tokens 可调
- 工具调用预留结构
- 导入/导出会话（Markdown / JSON）
- 深色模式 UI，移动端适配
- 纯前端，无框架依赖，数据存于 localStorage

## 文件结构

```
omnichat/
  index.html              — 开发版（引用外部 CSS/JS）
  omnichat.html    — 独立版（全部内联，可直接部署）
  style.css               — 全部样式
  script.js               — 全部业务逻辑
  manifest.json           — PWA 清单（添加到主屏幕）
  sw.js                   — Service Worker（离线缓存）
  README.md               — 本文件
```

## 使用方法

### 方式一：免费静态托管（推荐，iPhone 独立运行）

将项目上传到 GitHub Pages、Vercel 或 Netlify 等免费静态托管服务：

1. 创建 GitHub 仓库，推送所有文件
2. 启用 Settings → Pages → 选 `main` 分支 → Save
3. 获取 URL（如 `https://你的用户名.github.io/omnichat`）
4. iPhone Safari 打开该 URL
5. 点击 Safari 底部「分享」→「添加到主屏幕」
6. 主屏幕出现 OmniChat 图标，点击即可作为独立 App 运行

推荐使用 `omnichat.html`（独立版），也可使用 `index.html`（需同时部署 CSS/JS）。

### 方式二：本地文件打开

直接将 `omnichat.html` 保存到 iPhone「文件」App：
- AirDrop 传输到 iPhone
- 或通过 iCloud Drive / 邮件 / 微信发送
- 在「文件」中找到该文件，长按 →「共享」→ Safari 打开

> 本地文件通过 `file://` 协议打开时，PWA 安装和 Service Worker 不可用，但聊天功能正常。

### 方式三：局域网访问

确保 iPhone 与电脑在同一局域网：

1. 电脑上运行 `python -m http.server 8000`
2. 查看电脑局域网 IP（如 `192.168.1.100`）
3. iPhone Safari 打开 `http://192.168.1.100:8000`
4. 同样可「添加到主屏幕」安装为 PWA

## API Key 配置

打开设置面板，选择服务商后填入对应 API Key。各服务商 Key 获取地址：

- **OpenAI**：[platform.openai.com](https://platform.openai.com/) — Key 以 `sk-` 开头
- **xAI / Grok**：[console.x.ai](https://console.x.ai/) — Key 以 `xai-` 开头
- **DeepSeek**：[platform.deepseek.com](https://platform.deepseek.com/) — Key 以 `sk-` 开头
- **OpenRouter**：[openrouter.ai](https://openrouter.ai/) — Key 以 `sk-or-` 开头
- **Groq**：[console.groq.com](https://console.groq.com/) — Key 以 `gsk_` 开头
- **Moonshot (Kimi)**：[platform.moonshot.cn](https://platform.moonshot.cn/) — Key 以 `sk-` 开头
- **智谱 GLM**：[open.bigmodel.cn](https://open.bigmodel.cn/) — Key 以 `.` 结尾
- **SiliconFlow**：[siliconflow.cn](https://siliconflow.cn/) — Key 以 `sk-` 开头

## 模型管理

1. 选择服务商
2. 填写对应 API Key
3. 点击「刷新模型列表」
4. 从下拉列表选择模型

如需使用列表中不存在的模型，在「自定义模型名」输入框填写模型名称，将优先使用自定义名称。

## 参数说明

### System Prompt

定义 AI 的行为和角色，置于每条会话消息列表最前。

### Temperature

控制输出随机性。范围 0–2，默认 0.7。值越低输出越确定，越高越有创造性。

### Top P

核采样阈值。范围 0–1，默认 1。仅从累积概率达到该值的 token 中采样。

### Max Tokens

单次回复最大 token 数。需为正整数。

### Stream

默认开启。启用后 AI 回复逐字显示，关闭则等待完整回复后一次性显示。

## 工具调用

当前版本为工具调用预留了完整配置结构，尚未执行外部工具。设置中可以选择最大调用次数：

- 0：关闭（默认）
- 1 / 3 / 5 / 10 / 20：限制次数
- 无限：无上限调用

选择「无限」时风险提醒：

> 无限工具调用可能导致循环执行、长时间运行或产生大量 API 费用，请谨慎使用。

## 历史会话

左侧面板管理全部历史会话：

- **新建**：底部快捷栏「+ 新建」
- **切换**：点击会话列表中的会话
- **搜索**：搜索标题和消息内容
- **重命名**：点击会话右侧编辑图标，或点击顶部标题
- **删除**：点击会话右侧删除图标，需二次确认
- **清空全部**：面板底部按钮

### 导入导出

- **导出 Markdown**：导出当前会话为 .md 文件（底部「导出」按钮）
- **导出 JSON**：导出全部会话为 .json 备份文件（历史面板「导出全部 JSON」）
- **导入 JSON**：从 .json 文件恢复会话（历史面板「导入 JSON」）

导入时不覆盖已有的会话 ID，也不覆盖已保存的 API Key。

## 上下文管理

本工具**不会自动压缩、总结、截断或删除任何消息**。每次请求发送当前会话的完整消息历史。

上下文过长时，API 会返回错误。此时需手动清理：

- 「清空」：清空当前会话消息（保留参数）
- 「删轮」：删除最后一轮问答

顶部状态栏显示当前消息数量和大致字符数，方便判断上下文规模。

## CORS 说明

浏览器直接请求各服务商 API 可能被 CORS 策略阻止。这是浏览器安全机制，不是 Bug。

### 解决方案

推荐搭建本地代理服务，将 API Key 放在后端，由后端转发请求至 AI 服务商。示例（Node.js）：

```js
// proxy-server.js
const http = require('http');

http.createServer((req, res) => {
  // 转发至 https://api.x.ai 或 https://api.deepseek.com
  // 附加 Authorization header
}).listen(3000);
```

然后将 script.js 中的 API URL 改为 `http://localhost:3000/v1/chat/completions`。

## 安全

本项目是纯前端客户端，API Key 保存在浏览器 localStorage，请用户自行注意设备安全。

- API Key 仅保存在浏览器 localStorage
- 导出数据不包含 API Key
- 导入数据不覆盖已有 API Key
- 页面底部显示安全提醒
- 不要缓存或分享包含 API Key 的页面截图、录屏
- 建议升级为本地代理版本以提升安全性

## localStorage 空间不足

如遇 localStorage 空间不足：

1. 导出全部 JSON 备份
2. 清空不再需要的会话
3. 定期导出并清理

浏览器 localStorage 通常限制为 5–10 MB。

## 技术栈

纯 HTML + CSS + JavaScript，无框架，无构建工具。所有状态存于 localStorage。使用 IIFE 模式组织代码，避免全局变量污染。

## License

MIT
