---
title: Snoopy
slug: /
sidebar_position: 1
---

```text
┌─┐┌┐┌┌─┐┌─┐┌─┐┬ ┬
└─┐││││ ││ │├─┘└┬┘
└─┘┘└┘└─┘└─┘┴   ┴ 
```

# 用 AI 发现高意向对话

Snoopy 监控在线对话，寻找与你的业务目标匹配的高意向信号。

用自然语言定义你关注的内容，让 Snoopy 创建监控任务，持续扫描和筛选对话，让你专注于回复和外联。

## 安装

```bash
npm install -g @telepat/snoopy
```

要求：Node.js 20+、npm 10+

## 快速开始

1. 创建你的第一个监控任务：

```bash
snoopy job add
```

2. 列出所有任务：

```bash
snoopy jobs list
```

3. 立即运行一个任务（测试时限制为 5 条新项目）：

```bash
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

如果在 `job run`、`job enable`、`job disable`、`job delete`、`start`、`stop` 或 `errors` 中省略 `<jobRef>`，Snoopy 会显示你的任务列表并提示你选择一个。

4. 查看运行历史：

```bash
snoopy job runs <jobRef>
```

5. 查看分析数据：

```bash
snoopy analytics
snoopy analytics <jobRef> --days 7
```

6. 导出筛选结果：

```bash
snoopy export
snoopy export <jobRef> --json --last-run
```

7. 启动后台守护进程：

```bash
snoopy daemon start
```

## 最常用命令

- `job add`
- `job list`
- `job run [jobRef] --limit <N>`
- `job runs [jobRef]`
- `export [jobRef] --csv|--json [--last-run]`
- `start [jobRef]` / `stop [jobRef]`
- `delete [jobRef]`
- `daemon start|stop|status`
- `startup status`
- `doctor`

## 完整文档

- [入门概述](getting-started/overview.md)
- [安装](getting-started/installation.md)
- [快速开始](getting-started/quickstart.md)
- [指南](guides/scheduling-and-startup.md)
- [CLI 参考](reference/cli-reference.md)
- [数据库模式](reference/database-schema.md)
- [安全与密钥存储](technical/security.md)
- [E2E 冒烟测试指南](technical/e2e-testing.md)
- [贡献](contributing/development.md)

部署到 GitHub Pages：

```bash
GITHUB_OWNER=cozymantis GITHUB_REPO=snoopy npm run docs:deploy
```
