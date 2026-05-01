---
title: MCP 服务器
sidebar_position: 3
description: 如何使用 Snoopy 的 MCP 服务器实现智能体对 Reddit 监控的编程式访问。
keywords:
  - MCP
  - Model Context Protocol
  - 智能体
  - 监控
  - 工具
---

# MCP 服务器

Snoopy 提供第一方 MCP（Model Context Protocol，模型上下文协议）服务器，用于智能体的编程式访问。该服务器通过 stdio 传输将 Snoopy 的完整监控面作为 MCP 工具暴露出来。

## 启动服务器

```bash
snoopy mcp
```

服务器通过 stdio 传输运行，旨在由 MCP 客户端（智能体框架）派生。它不接受交互式输入。

## 传输和范围

- **传输方式**：stdio（JSON-RPC 消息在 stdout 上输出，日志在 stderr 上输出）
- **预期用途**：本地进程派生的 MCP 客户端
- **协议**：MCP 1.0，支持 initialize、tools/list 和 tools/call

## 可用工具

服务器暴露 19 个工具，按类别组织：

### 健康检查工具

| 工具 | 描述 |
|------|------|
| `snoopy_doctor` | 完整系统健康检查（数据库、API 密钥、守护进程、任务、启动、最近错误） |

### 守护进程工具

| 工具 | 描述 |
|------|------|
| `snoopy_daemon_status` | 显示守护进程是否运行及其 PID |
| `snoopy_daemon_start` | 启动后台守护进程 |
| `snoopy_daemon_stop` | 停止后台守护进程 |
| `snoopy_daemon_reload` | 不重启即可热重载任务计划 |

### 任务工具

| 工具 | 描述 |
|------|------|
| `snoopy_job_list` | 列出所有监控任务及其状态、子版块、计划 |
| `snoopy_job_runs` | 列出某个任务或所有任务的最近运行历史 |
| `snoopy_job_add` | 创建新的监控任务 |
| `snoopy_job_delete` | 删除任务及其所有数据（运行、扫描项、日志） |
| `snoopy_job_enable` | 启用任务的计划调度 |
| `snoopy_job_disable` | 禁用任务的计划调度 |
| `snoopy_job_run` | 触发一次即时任务运行 |

### 分析和结果工具

| 工具 | 描述 |
|------|------|
| `snoopy_analytics` | 显示任务的分析数据（Token、费用、帖子、评论） |
| `snoopy_export` | 将已鉴定的扫描项导出为 JSON 或 CSV |
| `snoopy_consume` | 列出并标记未消费的已鉴定结果 |

### 诊断工具

| 工具 | 描述 |
|------|------|
| `snoopy_errors` | 显示某个任务最近失败或出错的运行 |
| `snoopy_logs` | 查看特定运行的日志输出 |

### 设置工具

| 工具 | 描述 |
|------|------|
| `snoopy_settings_get` | 读取当前设置（模型、API 密钥状态、计划） |
| `snoopy_settings_set` | 更新单个设置项 |

## MCP 调用示例

### 列出工具

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

### 运行健康检查

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "snoopy_doctor",
    "arguments": {}
  }
}
```

### 列出任务

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "snoopy_job_list",
    "arguments": {}
  }
}
```

### 创建任务

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "snoopy_job_add",
    "arguments": {
      "name": "SaaS 线索监控",
      "subreddits": ["startups", "SaaS", "entrepreneur"],
      "qualificationPrompt": "仅当用户正在积极寻求 SaaS 推荐或替代方案时才判定为合格。",
      "scheduleCron": "*/30 * * * *"
    }
  }
}
```

### 导出结果

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "snoopy_export",
    "arguments": {
      "jobRef": "saas-lead-monitor",
      "format": "json",
      "lastRun": true
    }
  }
}
```

## 错误处理

所有工具以 MCP 标准格式返回错误：

```json
{
  "content": [{ "type": "text", "text": "错误信息" }],
  "isError": true
}
```

常见错误：

| 错误 | 含义 |
|-------|---------|
| `Job not found: <ref>` | 无效的任务引用；请检查 `snoopy_job_list` |
| `Run not found: <id>` | 无效的运行 ID；请检查 `snoopy_job_runs` |
| `Unknown setting: <key>` | `snoopy_settings_set` 的无效设置键 |

## 故障排除

| 症状 | 可能原因 | 解决方案 |
|---------|-------------|-----|
| 服务器立即退出 | Stdio 传输错误 | 确保在正确的 MCP 客户端上下文中运行 |
| 智能体中不显示工具 | 服务器未注册 | 运行 `snoopy agent install <runtime>` |
| Doctor 显示 API 密钥缺失 | 密钥未配置 | 运行 `snoopy settings` 或设置 `SNOOPY_OPENROUTER_API_KEY` |
| 任务运行失败 | 守护进程未运行 | 运行 `snoopy daemon start` |

## 相关页面

- [智能体设置](./agent-setup.md) — 在智能体框架中注册 Snoopy
- [技能](./skills.md) — Snoopy 技能包
- [面向智能体](./index.md) — 智能体约束和决策流程
