---
title: 技能
sidebar_position: 4
description: 面向 AI 智能体工作流的 Snoopy 技能包。
keywords:
  - 技能
  - SKILL.md
  - 智能体技能
  - 监控
---

# 技能

Snoopy 附带一个技能包，为 AI 智能体提供零上下文工作流指导，用于 Reddit 监控。

## 主要技能包

`skill/snoopy-cli/` 包是 Snoopy 的可安装技能包。

- **位置**：`skill/snoopy-cli/SKILL.md`（仓库根目录）
- **用途**：引导智能体完成安装、设置、任务管理、调试和 MCP 集成
- **格式**：符合 Agent Skills 规范

### 使用场景

- 从零开始安装和配置 Snoopy
- 创建和管理监控任务
- 使用错误和日志调试失败的运行
- 在智能体框架中注册 Snoopy（Claude、Cursor、VS Code 等）
- 使用 MCP 服务器进行编程式访问
- 导出已鉴定结果供下游处理

### 核心文件

`skill/snoopy-cli/SKILL.md` 包含：

- 安装和设置说明（交互式 + 非交互式）
- 所有操作的确定性工作流
- MCP 工具集文档
- 参数语义和约束
- 陷阱和注意事项
- 故障处理矩阵
- 来源证据映射

### 配套参考

- `references/command-catalog.md` — 完整命令/参数矩阵
- `references/troubleshooting.md` — 故障诊断

## 安装位置

### 项目级别

- `.agents/skills/snoopy-cli/`
- `.github/skills/snoopy-cli/`
- `.cursor/skills/snoopy-cli/`

### 用户级别

- `~/.agents/skills/snoopy-cli/`
- `~/.copilot/skills/snoopy-cli/`
- `~/.claude/skills/snoopy-cli/`

## 必需的技能契约

每个分发的技能必须记录：

1. **名称**：`snoopy-cli`（kebab-case 格式，与目录名匹配）
2. **输入**：OpenRouter API 密钥、子版块、资格鉴定提示词、任务名称、计划
3. **护栏**：始终需要 API 密钥，计划任务需要守护进程运行
4. **输出**：任务运行、已鉴定结果、分析数据、错误报告
5. **故障模式**：API 密钥缺失、守护进程未运行、Token 截断、数据库锁定
6. **验证提示词**：应触发和不应触发的示例

## 发布规则

- 规范页面：`docs/for-agents/skills.md`
- 人类文档链接：`docs/getting-started/installation.md`、`docs/getting-started/quickstart.md`
- 具体示例：所有命令示例均可直接复制粘贴使用
- 同步要求：技能更新必须与 CLI 行为变更同时进行

## 同步和漂移策略

当 MCP 工具面发生变化时，在同一个变更中更新：

1. `src/mcp/tools.ts`（模式和契约）
2. `src/mcp/server.ts`（处理器）
3. `docs/for-agents/mcp-server.md`（MCP 文档）
4. `skill/snoopy-cli/SKILL.md`（技能文档）

当智能体安装目标发生变化时，更新：

1. `src/agent/install.ts`（安装逻辑）
2. `docs/for-agents/agent-setup.md`（设置文档）
3. `skill/snoopy-cli/SKILL.md`（技能文档）

## 相关页面

- [MCP 服务器](./mcp-server.md) — MCP 服务器文档
- [智能体设置](./agent-setup.md) — 框架注册说明
- [面向智能体](./index.md) — 智能体约束和决策流程
