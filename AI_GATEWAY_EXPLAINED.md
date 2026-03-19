# Cloudflare Workers AI 网关详解

## 📍 AI 网关在哪里？

### 重要说明
**Workers AI 不是独立的"网关"服务，而是 Cloudflare Workers 平台的内置功能！**

### 访问方式

#### 1. **通过 Binding（推荐）**
```typescript
// 在 wrangler.toml 中配置
[ai]
binding = "AI"

// 在代码中使用
const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  prompt: "Hello"
});
```

#### 2. **通过 REST API**
```bash
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}
Authorization: Bearer {api_token}
Content-Type: application/json

{
  "prompt": "Hello"
}
```

**你的具体地址**：
```
POST https://api.cloudflare.com/client/v4/accounts/d1215a30b84b673ef0367010b0e78c10/ai/run/@cf/meta/llama-3.1-8b-instruct
```

### 在 Cloudflare 控制台的位置

1. 访问：[Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的账户：`Suyee88@163.com`
3. 导航到：**Workers & Pages** → **Workers AI**
4. 或者直接访问：`https://dash.cloudflare.com/?to=/:account/workers/ai`

### 查看使用情况和日志

#### 方法 1：Cloudflare Dashboard
1. 登录 Dashboard
2. 进入 **Workers & Pages**
3. 选择你的 Worker：`cloudflare-works-openai-gateway`
4. 点击 **Observability** 或 **Logs** 标签
5. 查看实时日志和使用统计

#### 方法 2：Wrangler CLI
```bash
# 查看实时日志
wrangler tail cloudflare-works-openai-gateway

# 查看部署历史
wrangler deployments list cloudflare-works-openai-gateway

# 查看 AI 模型列表
wrangler ai models
```

#### 方法 3：GraphQL API
```bash
POST https://api.cloudflare.com/client/v4/graphql
Authorization: Bearer {api_token}
Content-Type: application/json

{
  "query": "..."
}
```

### 可用的模型

运行 `wrangler ai models` 查看完整列表，或使用以下模型：

**文本生成**：
- `@cf/meta/llama-3.1-8b-instruct` (当前使用)
- `@cf/meta/llama-3-8b-instruct`
- `@cf/mistral/mistral-7b-instruct-v0.1`

**代码生成**：
- `@cf/mistral/mistral-7b-instruct-v0.1` (当前使用)
- `@cf/qwen/qwen1.5-7b-chat-awq`

**图像生成**：
- `@cf/stabilityai/stable-diffusion-xl-base-1.0` (当前使用)

**图像识别**：
- `@cf/meta/llama-3.2-11b-vision-instruct`
- `@cf/openai/clip-vit-base-patch32`

### 使用限制和配额

**免费计划**：
- 每天 10,000 个神经元（neurons）
- 1 个模型并发执行

**付费计划**：
- 按需付费
- 更高的并发限制

**神经元计算**：
- Llama 3.1 8B: ~8 neurons/token
- Mistral 7B: ~7 neurons/token
- Stable Diffusion XL: ~50,000 neurons/image

### 实际调用示例

我们的 Worker 调用的完整流程：

```
用户请求
  ↓
POST /v1/chat/completions
  ↓
Worker 验证 API Key (从 KV)
  ↓
识别任务类型 (text/code/image)
  ↓
选择模型 (@cf/meta/llama-3.1-8b-instruct)
  ↓
调用 env.AI.run() ← 这里就是 AI 网关
  ↓
返回结果
  ↓
转换为 OpenAI 格式
  ↓
返回给用户
```

### 日志示例

从实际调用中看到的日志：

```
POST https://cloudflare-works-openai-gateway.suyee88.workers.dev/v1/chat/completions
  (log) Validating API key: test-api-key
  (log) KV lookup result: valid-key
  (log) Task type: text Model: @cf/meta/llama-3.1-8b-instruct
  (log) Running AI model: @cf/meta/llama-3.1-8b-instruct
  (log) Prompt: user: Hello AI Gateway
  (log) AI result: {
    "response": "Hello there, I'm delighted to assist you...",
    "usage": {
      "prompt_tokens": 68,
      "completion_tokens": 17,
      "total_tokens": 85
    }
  }
```

### 常见问题

**Q: 为什么我在控制台看不到 "AI Gateway"？**
A: 因为 Workers AI 是 Workers 的内置功能，不是独立服务。在 Workers 页面中查看。

**Q: 如何查看我使用了多少配额？**
A: 在 Dashboard 的 Workers & Pages → Workers AI → Usage 标签查看。

**Q: 如何查看调用了哪些模型？**
A: 使用 `wrangler tail` 查看实时日志，或在 Dashboard 查看 Logs。

**Q: 为什么 API 调用返回 401？**
A: 检查：
1. AI binding 是否正确配置
2. Account ID 是否正确
3. API token 是否有 Workers AI 权限

### 快速验证

运行以下命令验证你的配置：

```bash
# 1. 验证 Workers 部署
wrangler whoami

# 2. 查看 Workers 列表
wrangler worker list

# 3. 查看实时日志
wrangler tail cloudflare-works-openai-gateway

# 4. 测试 API 调用
curl -X POST https://cloudflare-works-openai-gateway.suyee88.workers.dev/v1/chat/completions \
  -H "Authorization: Bearer test-api-key" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### 总结

**Workers AI = Cloudflare 内置的 AI 推理服务**

- ✅ 无需单独配置网关
- ✅ 通过 Binding 自动认证
- ✅ 按使用量付费
- ✅ 全球边缘网络运行
- ✅ 50+ 预置模型可用

你的 Worker 正在成功使用这个服务！
