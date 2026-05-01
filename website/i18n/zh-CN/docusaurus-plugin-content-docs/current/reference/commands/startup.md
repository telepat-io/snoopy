---
title: startup
sidebar_position: 7
---

# `startup`

`startup` 组管理操作系统级别的注册，以便 Snoopy 可以在重启或登录时启动。

启动注册始终为显式选择加入。

`reboot` 组是面向用户的启动行为命令的别名。

## 别名

以下命令与其对应的 `startup` 命令行为一致：

- `reboot enable`
- `reboot disable`
- `reboot status`

示例：

```bash
snoopy reboot enable
snoopy reboot status
```

## 子命令

### `startup install`

安装启动注册构件。

```bash
snoopy startup install
```

### `startup uninstall`

移除已安装的启动注册构件。

```bash
snoopy startup uninstall
```

### `startup enable`
### `startup disable`
### `startup status`

控制或检查重启/登录时自动启动行为。

```bash
snoopy startup enable
snoopy startup disable
snoopy startup status
```

## 说明

实现因操作系统而异：

- macOS：launchd
- Linux：systemd 用户服务，支持 cron 回退
- Windows：仅 Task Scheduler（无注册表 Run 回退）
