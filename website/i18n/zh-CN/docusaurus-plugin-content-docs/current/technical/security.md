---
title: 安全
sidebar_position: 5
---

# 安全与密钥存储

本文档介绍 Snoopy 如何存储密钥和运行数据。

## 密钥类型

Snoopy 直接处理以下高价值密钥：

- OpenRouter API 密钥
- Reddit OAuth 客户端密钥（可选回退模式）

## 高价值密钥存储

Snoopy 对 OpenRouter API 密钥和 Reddit OAuth 客户端密钥使用相同的存储策略。

主路径：

- 通过 `keytar` 使用操作系统凭据存储

回退路径：

- 环境变量
	- `SNOOPY_OPENROUTER_API_KEY`
	- `SNOOPY_REDDIT_CLIENT_SECRET`

默认根目录：

- `~/.snoopy`

## Reddit OAuth 回退元数据

非机密的 Reddit 回退元数据存储在 SQLite 设置中：

- 应用名称
- 客户端 ID

Reddit 客户端密钥不会存储在 SQLite 中。

## 静态数据

主要本地文件：

- `snoopy.db`（任务配置、运行分析、扫描项、Reddit 应用名称/客户端 ID 元数据）
- `logs/snoopy.log`
- `daemon.pid`

所有文件存储在应用根目录下（默认为 `~/.snoopy`）。

## 日志

Snoopy 将纯文本日志行写入：

- `<root>/logs/snoopy.log`

操作建议：

- 避免在自定义补丁中记录密钥。
- 将日志视为可能包含敏感信息，因为标题/正文和错误载荷可能包含用户/业务上下文。

## 威胁模型说明

当前设计针对本地开发者/运维使用场景进行了优化：

- 假设为单用户机器
- 无多租户授权层
- 无远程控制面

## 加固建议

- 对于类生产环境，使用专用机器/用户帐户。
- 限制应用根目录的文件系统权限。
- 优先使用 keytar 可用的环境，或在运行时通过环境变量注入密钥。
- 定期轮换 OpenRouter 密钥。
- 如果使用回退凭据，定期轮换 Reddit OAuth 客户端密钥。
- 如果你依赖历史资格审查数据，请安全备份数据库。
- 考虑在主机上启用全磁盘加密。

## 事件响应快速步骤

如果怀疑密钥已泄露：

1. 在提供商控制台（OpenRouter 和/或 Reddit 应用）中撤销/轮换受影响的密钥。
2. 运行 `snoopy settings` 并更新凭据。
3. 如果你的部署使用基于环境变量的密钥注入，请更新运行环境变量。
4. 检查日志中是否有意外泄漏的密钥。
