---
title: 调度与开机启动
sidebar_position: 4
---

# 调度、Cron、守护进程与开机启动

本文档说明 Snoopy 如何持续运行任务并在重启后恢复运行。

## 调度模型

- 调度器：`node-cron`
- 每个启用的任务注册一个 cron 任务。
- 创建任务时的默认调度：`*/30 * * * *`（每 30 分钟）。

每次触发时：

1. 从数据库重新加载任务。
2. 如果任务仍处于启用状态，执行运行器。
3. 运行统计信息持久化到 `job_runs`。
4. 扫描项持久化到 `scan_items`，用于去重和审计。

## 守护进程生命周期

命令：

- `snoopy daemon start`
- `snoopy daemon stop`
- `snoopy daemon status`
- `snoopy daemon run`

行为：

- `daemon start` 启动分离进程并写入 PID 文件。
- PID 文件路径：`<root>/daemon.pid`。
- `daemon status` 验证 PID 文件和进程存活状态。
- `daemon run` 使调度器保持在前台运行，适用于调试。

## 手动运行与定时运行

手动运行：

```bash
snoopy job run <jobRef> --limit 5
```

手动运行适用于：

- 快速评分标准检查
- 模型配置验证
- 新任务的冒烟测试

一旦任务经过验证可靠，定时运行更适合持续监控。

## Cron 表达式

`jobs.schedule_cron` 支持 `node-cron` 所使用的标准 cron 语法。

示例：

- `*/30 * * * *` 每 30 分钟
- `0 * * * *` 每小时
- `0 9 * * *` 每天 09:00

## 开机自启/登录自启

Snoopy 支持操作系统启动注册。

启动注册始终需要显式选择加入。Snoopy 仅在你运行 startup enable/install（或在任务设置期间明确选择安装启动项）时才会进行配置。

命令：

- `snoopy startup install`
- `snoopy startup uninstall`
- `snoopy startup enable`
- `snoopy startup disable`
- `snoopy startup status`

别名组：

- `snoopy reboot enable|disable|status`

### macOS

主要方式：

- launchd LaunchAgent

状态检查：

- `~/Library/LaunchAgents/com.snoopy.daemon.plist`

### Linux

首选方式：

- systemd 用户服务（可用时）

回退方式：

- cron `@reboot` 条目

状态检查：

- `~/.config/systemd/user/` 中的 systemd 服务文件
- 包含 `snoopy daemon run` 的 crontab 条目

### Windows

首选方式：

- 任务计划程序作业

状态检查：

- `schtasks /query /tn "Snoopy\\Daemon"`

如果任务计划程序设置失败，Snoopy 会返回错误，而不是静默回退到其他持久化机制。

## 操作建议

- 设置期间：配置完成后运行 `snoopy doctor`。
- 启用开机启动前：确认 `daemon start` 正常工作。
- 重启注册后：使用 `startup status` 和 `daemon status` 验证。
- 调试干扰较多的任务：使用带 `--limit` 的手动运行。
