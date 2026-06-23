# grain-seo-mcp

SEO analysis MCP server — Google Search Console, Bing Webmaster Tools, GA4 analytics, with custom Grain Analysis Tools.

> English | [简体中文](./README_zh-CN.md)

## Grain Analysis Tools (new)

| Tool | What it does |
|------|-------------|
| `grain_content_decay` | Detect pages with 3 consecutive 30-day traffic decline |
| `grain_traffic_drops` | Diagnose WHY traffic dropped: ranking loss / CTR collapse / demand decline |
| `grain_ctr_benchmark` | Compare CTR vs industry benchmarks by position |
| `grain_verify_claim` | Anti-hallucination: re-query GSC to verify numeric claims (±5% tolerance) |
| `grain_topic_cluster` | Aggregate performance for URL path patterns (e.g. /blog/) |
| `grain_content_recommendations` | Prioritized SEO actions: update / create / consolidate |

## Platform Tools

Google Search Console, Bing Webmaster Tools, Google Analytics 4 tools. See `tools_list.md` for full list.

## Setup

### Google Cloud Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project, enable **Search Console API**
3. Create OAuth credentials (Desktop app) or Service Account
4. Download JSON

### Claude Code Configuration

Add to `~/.claude/settings.json`:

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

First use opens browser for Google sign-in. Token cached after that.

## License

MIT
