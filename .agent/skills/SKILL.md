---
name: grain-seo
description: Expert skill for installing, configuring, and troubleshooting the Grain SEO MCP server.
---

# Grain SEO MCP Expert Skill

This skill enables agents to manage the Grain SEO MCP server (Google, Bing, and GA4). Use this to resolve configuration issues, list sites, and run performance queries.

## 🚀 Quick Start (Recommended)

Run the server directly without installation to verify setup:
```bash
npx grain-seo setup
```

## 🛠️ Installation

### Global Installation (CLI access)
```bash
npm install -g grain-seo-mcp
```

### Local Development
```bash
npm install && npm run build
```

## ⚙️ Configuration Patterns

### 1. Google Search Console (OAuth 2.0)
The default and most common way. Initiates a local server at `localhost:3000` for browser authorization.
```bash
grain-seo setup --engine=google
```

### 2. Bing Webmaster Tools
Requires an API key from [Bing Webmaster Settings](https://www.bing.com/webmasters/settings/api).
```bash
grain-seo setup --engine=bing
```

### 3. Google Analytics 4 (Service Account)
Primary support for Service Accounts. JSON key file path is required.
```bash
grain-seo setup --engine=ga4
```

## 🔍 Diagnostic & Debugging Workflows

If the user reports "0 results" or "not connected" errors, follow this diagnostic loop:

### Step 1: Check Connectivity
Run the internal health check to verify API tokens and connectivity.
```bash
grain-seo diagnostics
```

### Step 2: Verify Authorized Sites
Verify which sites are actually authorized for use.
```bash
grain-seo sites
```

### Step 3: Verbose Debugging
Enable the internal logger to track account resolution and site filtering. Logs are sent to `stderr`.
```bash
DEBUG=true grain-seo sites_list
```

## 🧪 Advanced Account Management

### List All Configured Accounts
```bash
grain-seo accounts list
```

### Site Boundary Management
Grain SEO allows restricting an account to specific sites.
```bash
# Add a site to an account's whitelist
grain-seo accounts add-site --account=email@example.com --site=https://example.com/

# Remove an account entirely
grain-seo accounts remove --account=email@example.com
```

## 💡 Troubleshooting "0 Results" Guide

Common reasons for empty results:
1.  **Protocol Mismatch**: `https://example.com/` (URL prefix) is different from `example.com` (Domain).
2.  **GSC Data Lag**: Data is typically unavailable for the last 2-3 days. Query ranges older than 3 days.
3.  **Account Scoping**: The site might not be in the account's configured boundary. Use `grain-seo sites` to confirm.
