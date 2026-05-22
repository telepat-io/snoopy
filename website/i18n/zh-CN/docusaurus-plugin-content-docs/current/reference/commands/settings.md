---
title: settings
sidebar_position: 5
---

# `settings`

`settings` 命令打开一个交互式设置菜单。

```bash
snoopy settings
```

## 可配置项

- OpenRouter API 密钥
- 默认模型 ID
- 模型设置：
  - temperature
  - max tokens
  - top-p
- Reddit OAuth 备用凭据（可选）：
  - 应用名称（默认为生成的 `snoopy-<random>`，可编辑）
  - client ID
  - client secret（在可用时通过 keychain 存储为高价值密钥）

所有设置同时显示在一个可导航的菜单中。使用上下方向键并按 Enter 直接跳转到要编辑的设置项，然后返回菜单。

类似密钥的值在菜单中以掩码形式显示：

- API 密钥：部分掩码
- Reddit client ID：部分掩码
- Reddit client secret：仅显示为已配置/未配置（绝不打印实际值）

密钥存储行为：

- 如果 keychain 存储可用，通过 `snoopy settings` 编辑的密钥将被持久化。
- 如果 keychain 存储不可用，Snoopy 改为从环境变量读取密钥：
  - `TELEPAT_OPENROUTER_KEY`
  - `SNOOPY_REDDIT_CLIENT_SECRET`
- 在不可用的情况下，在设置界面输入密钥值不会持久化它们。

选择 `Save changes` 以保存更新，或选择 `Cancel`/`Esc` 退出而不保存。

## 何时使用

在以下情况使用 `settings`：

- 首次配置 Snoopy
- 更换模型
- 更换 API 凭据
- 配置或更换可选的 Reddit OAuth 备用凭据
