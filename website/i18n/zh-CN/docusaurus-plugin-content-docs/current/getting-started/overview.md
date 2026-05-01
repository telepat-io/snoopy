---
title: 概述
---

# 入门概述

Snoopy 帮助团队监控 Reddit 上的高意向对话，利用 AI 筛选结果，并按计划运行可重复的扫描任务。

使用本部分从零开始，建立可靠的第一个工作流程。

## 你需要什么

- Node.js 20+
- npm 10+
- OpenRouter API 密钥

## 建议路径

1. 安装 Snoopy 并配置凭据：[安装](installation.md)
2. 运行你的第一个任务并验证输出：[快速开始](quickstart.md)
3. 了解命令界面详情：[CLI 参考](../reference/cli-reference.md)

## 核心概念

- 任务（Jobs）定义你的目标受众和筛选标准。
- 运行（Runs）执行扫描并保存分析数据。
- 守护进程模式（Daemon mode）按 cron 计划执行已启用的任务。
- 结果本地存储在 SQLite 中，可导出为 CSV。
