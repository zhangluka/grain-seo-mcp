# grain-seo-mcp

SEO 分析 MCP 服务器 — Google Search Console、Bing 站长工具、GA4 数据分析，以及自定义 Grain 分析工具集。

> [English](./README.md) | 简体中文

## Grain 分析工具（新增）

| 工具 | 功能 |
|------|------|
| `grain_content_decay` | 检测连续 3 个 30 天周期流量持续下降的页面 |
| `grain_traffic_drops` | 诊断流量下降原因：排名丢失 / CTR 崩塌 / 搜索需求下降 |
| `grain_ctr_benchmark` | 按排名位置对比实际 CTR 与行业基准 |
| `grain_verify_claim` | 反幻觉机制：重新查询 GSC 验证数值声明（±5% 容差） |
| `grain_topic_cluster` | 按 URL 路径模式聚合表现数据（如 /blog/） |
| `grain_content_recommendations` | 优先级排序的 SEO 操作建议：更新 / 创建 / 合并 |

## 平台工具

支持 Google Search Console、Bing 站长工具、Google Analytics 4 的完整工具集。详见 `tools_list.md`。

## 安装配置

### Google Cloud 凭据

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目，启用 **Search Console API**
3. 创建 OAuth 凭据（桌面应用）或服务账号
4. 下载 JSON 文件

### Claude Code 配置

在 `~/.claude/settings.json` 中添加：

```json
{
  "mcpServers": {
    "grain-seo": {
      "command": "node",
      "args": ["/Users/bobby/Projects/Github/zhangluka/grain-seo-mcp/dist/index.js"],
      "env": {
        "GSC_OAUTH_SECRETS_FILE": "/path/to/client_secrets.json"
      }
    }
  }
}
```

首次使用时会打开浏览器进行 Google 登录授权，之后 Token 会被缓存。

## 许可证

MIT
