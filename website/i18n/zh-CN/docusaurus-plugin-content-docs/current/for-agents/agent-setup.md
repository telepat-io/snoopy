---
title: 智能体设置
sidebar_position: 5
description: 将 Snoopy 注册到 AI 智能体框架，以实现基于 MCP 的 Reddit 监控。
keywords:
  - 智能体设置
  - MCP 注册
  - Claude
  - Cursor
  - VS Code
  - Codex
  - Gemini
  - OpenCode
---

# 智能体设置

将 Snoopy 的 MCP 服务器注册到 AI 智能体框架，以实现编程式 Reddit 监控。

## 快速开始

```bash
# 注册到 Claude Code
snoopy agent install claude

# 注册到 Cursor
snoopy agent install cursor

# 注册到 VS Code
snoopy agent install vscode

# 检查注册状态
snoopy agent status
```

## 支持的框架

| 框架 | 运行时 ID | 配置目标 | 格式 |
|-----------|-----------|---------------|--------|
| Claude Code | `claude` | `~/.claude/settings.json` | JSON |
| Claude Desktop | `claude-desktop` | 平台特定的 Claude Desktop 配置 | JSON |
| ChatGPT Desktop | `chatgpt` | 通过开发者模式手动设置 | 不适用 |
| Gemini CLI | `gemini` | `~/.gemini/settings.json` | JSON |
| Codex | `codex` | `~/.codex/config.toml` | TOML |
| Cursor | `cursor` | `~/.cursor/mcp.json` | JSON |
| VS Code | `vscode` | `.vscode/mcp.json`（工作区级别） | JSON |
| OpenCode | `opencode` | `opencode.json`（项目根目录） | JSON |
| 通用 | `generic-mcp` | 打印到 stdout | 手动 |

## 各框架设置

### Claude Code

```bash
snoopy agent install claude
```

在 `~/.claude/settings.json` 的 `mcpServers` 下注册 `snoopy` MCP 服务器。

### Claude Desktop

```bash
snoopy agent install claude-desktop
```

注册到 Claude Desktop 配置文件（macOS：`~/Library/Application Support/Claude/claude_desktop_config.json`）。

### ChatGPT Desktop

```bash
snoopy agent install chatgpt
```

打印手动设置说明。ChatGPT Desktop 需要通过开发者模式使用远程 HTTP MCP 端点。

### Gemini CLI

```bash
snoopy agent install gemini
```

在 `~/.gemini/settings.json` 的 `mcpServers` 下注册。

### Codex

```bash
snoopy agent install codex
```

向 `~/.codex/config.toml` 追加 `[mcp_servers.snoopy]` 节。

### Cursor

```bash
snoopy agent install cursor
```

在 `~/.cursor/mcp.json` 的 `mcpServers` 下注册。

### VS Code

```bash
snoopy agent install vscode
```

在 `.vscode/mcp.json` 的 `servers` 下注册（工作区级别）。

### OpenCode

```bash
snoopy agent install opencode
```

在 `opencode.json` 的 `mcp` 下注册（项目根目录）。

### 通用 MCP

```bash
snoopy agent install generic-mcp
```

打印 JSON 配置片段，用于在任何兼容 MCP 的框架中手动注册。

## 卸载

```bash
snoopy agent uninstall <runtime>
```

仅从框架配置中移除 Snoopy 拥有的条目。其他 MCP 服务器将保留。

## 验证

注册后，验证设置：

1. 重启或重载智能体框架。
2. 检查 Snoopy 工具是否出现在框架的工具列表中。
3. 运行简单命令（例如 `snoopy_doctor`）以验证连通性。

## 手动注册

如果 `snoopy agent install` 不适用于您的框架，请手动注册：

```json
{
  "mcpServers": {
    "snoopy": {
      "command": "snoopy",
      "args": ["mcp"]
    }
  }
}
```

对于 VS Code：

```json
{
  "servers": {
    "snoopy": {
      "type": "stdio",
      "command": "snoopy",
      "args": ["mcp"]
    }
  }
}
```

## 故障排除

| 症状 | 可能原因 | 解决方案 |
|---------|-------------|-----|
| 工具未出现 | 框架未重启 | 注册后重启框架 |
| 服务器无法启动 | `snoopy` 不在 PATH 中 | 用 `which snoopy` 验证或使用绝对路径 |
| Doctor 显示问题 | 系统不健康 | 运行 `snoopy doctor` 并修复报告的问题 |

## 相关页面

- [MCP 服务器](./mcp-server.md) — MCP 服务器文档和工具列表
- [技能](./skills.md) — Snoopy 技能包
- [面向智能体](./index.md) — 智能体约束和决策流程
