# 模型列表自动更新

AI 设置中的下拉框无需 Key 即可刷新：没有 Key 时通过本站 `/api/models/catalog` 读取 models.dev 公开目录，使用供应商原生 ID 并按发布日期排序。有 Key 时优先读取当前供应商的账号列表。两者缓存相互隔离。公开目录是社区维护数据，不代表账号或自定义网关已开通该型号，也不能保证与供应商发布同步到秒。

固定列表只作为尚未成功同步时的备用项，不参与“最新模型”判断，也不会覆盖用户当前选定的模型。

- 每次进入网站时，通过一个批量请求后台更新现有五家供应商的公开目录，无需 Key，独立于设置面板是否打开；同一页面内不会重复启动。不自动请求账号或自定义网关接口。
- 打开设置、切换供应商、编辑 Key/地址、窗口聚焦、页面可见性变化和时间流逝均不发起刷新，只读取已有缓存。
- “刷新模型”立即请求当前供应商的最新列表：有 Key 时读取账号列表，否则读取公开目录。页面重新加载后会再次执行一次批量入口刷新，即使已有缓存。较晚返回的入口请求不会覆盖手动刷新结果。
- 正常状态不显示同步数量、时间和来源说明，仅在加载或失败时显示必要提示。
- 查询是只读模型列表请求，不发送简历内容，不调用生成接口。公开目录服务固定请求 `https://models.dev/api.json`，不接收或转发用户自定义目标和密钥；合并并发请求，自动检查可复用 60 秒快照，手动刷新绕过该快照。
- 缓存按供应商、实际模型接口地址和密钥的 SHA-256 摘要隔离；缓存数据不另存密钥。缺少 Web Crypto 安全上下文时仅使用会话内存缓存，存储被禁用时仍可使用。
- 不同供应商、地址和密钥分别保存请求结果；旧响应不能更新当前面板。同一配置连续手动刷新会取消上一请求。
- 刷新失败、返回空列表或不支持模型发现时保留已有列表，自定义模型输入仍可使用。
- 当前模型不在新列表时保留选择并提示，不自动切换、不推断已退役。下拉菜单打开期间固定选项，关闭后再应用列表变化，避免点击中的选项移动。

供应商适配：

| 配置 | 模型接口 | 处理方式 |
| --- | --- | --- |
| OpenAI / DeepSeek / OpenAI 兼容网关 | 配置地址下的 `/models` | Bearer 鉴权，识别完整 `/chat/completions` 地址 |
| Anthropic | `/v1/models` | 原生请求头，读取 `has_more` / `last_id` 游标分页 |
| Gemini | `/v1beta/models` 或配置地址下的 `/models` | `x-goog-api-key`，读取所有分页，只保留支持 `generateContent` 的模型 |
| OpenRouter 官方及区域域名 | `/api/v1/models/user` | 使用账号过滤列表，读取 offset 分页；自定义兼容网关仍使用 `/models` |

排除明确返回为 retired 的模型、明确不支持文本输出的模型，以及常见仅用于嵌入、图像、转录等独立 API 的模型 ID。上游未提供完整能力信息时，列出的模型仍需通过连接测试确认；不把获取列表成功等同于生成能力已验证。

接口依据：[OpenAI](https://developers.openai.com/api/reference/resources/models/methods/list)、[Anthropic](https://platform.claude.com/docs/en/api/models/list)、[Gemini](https://ai.google.dev/api/models)、[OpenRouter 官方 SDK](https://github.com/OpenRouterTeam/go-sdk/blob/main/models.go)。浏览器直连沿用现有项目架构；不允许跨域或没有模型接口的上游会显示可重试状态，保留手动填写。

公开数据格式依据：[models.dev](https://models.dev/)、[数据接口](https://models.dev/api.json)。

验证：`src/test/utils/modelCatalog.test.ts` 覆盖接口、分页、过滤与缓存隔离；`src/test/utils/publicModelCatalog.test.ts` 检查公开目录的原生 ID、过滤、无鉴权和固定上游；`e2e/model-catalog.spec.ts` 使用模拟上游响应验证桌面和移动端的入口单次同步、手动刷新、失败回退、旧请求隔离，以及五家供应商无 Key 刷新和补充 Key 后手动切换账号列表。也检查超过一天、窗口聚焦、重开设置和编辑凭证均不会自动刷新。不使用真实供应商密钥进行付费调用。
