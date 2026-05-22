---
title: 安装与设置
sidebar_position: 2
---

# 安装与设置

按照本指南完成首次设置：安装 Snoopy、配置 OpenRouter 密钥、添加第一个任务，并验证一切正常运行。

## 环境要求

- Node.js 20+
- npm 10+
- OpenRouter API 密钥（资格审查所需）

如果没有 OpenRouter 密钥，任务运行将在 Snoopy 进入资格审查阶段时失败。

## 安装 Snoopy

通过 npm 安装（推荐）：

```bash
npm install -g @telepat/snoopy
snoopy --help
```

从源码安装（开发构建）：

```bash
npm install
npm run build
npm link
snoopy --help
```

## 配置 OpenRouter API 密钥

通过交互式设置流程配置密钥：

```bash
snoopy settings
```

导航到 **OpenRouter API Key**，粘贴你的密钥，然后保存。

存储行为：
- 当操作系统密钥链可用时，Snoopy 将密钥存储在密钥链中。
- 如果密钥链存储不可用，通过环境变量配置密钥：
	- `TELEPAT_OPENROUTER_KEY`
	- `SNOOPY_REDDIT_CLIENT_SECRET`

如果密钥缺失，在密钥链存储可用的情况下，`snoopy job add` 会在首次设置时提示输入。

## 添加第一个任务

启动引导式任务创建流程：

```bash
snoopy job add
```

该流程的作用：
- 收集你的监控意图和后续详情
- 生成任务名称、标识符（slug）以及资格审查提示词
- 将任务保存到本地
- 立即执行首次扫描
- 首次运行尝试完成后启用定时执行

你也可以使用简短的别名：

```bash
snoopy add
```

设置完成后，列出你的任务：

```bash
snoopy jobs list
```

运行带有数量上限的快速验证扫描：

```bash
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

## 验证设置

运行健康检查：

```bash
snoopy doctor
```

至少确认以下内容：
- OpenRouter API 密钥已配置
- 数据库和文件系统检查通过

## 首次使用命令顺序

如果你需要一步到位的完整设置路径：

```bash
# 1) 全局安装
npm install -g @telepat/snoopy

# 2) 可选：在创建任务前配置密钥
snoopy settings

# 3) 创建第一个任务（如需要，会提示输入缺失的密钥/设置）
snoopy job add

# 4) 验证健康状况
snoopy doctor
```

## 相关文档

- [CLI 参考](../reference/cli-reference.md)
- [Job 命令参考](../reference/commands/job.md)
- [Agent 操作](../guides/agent-operations.md)
- [安全与密钥存储](../technical/security.md)
