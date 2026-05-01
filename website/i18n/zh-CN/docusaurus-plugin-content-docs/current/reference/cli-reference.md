---
title: CLI 参考
sidebar_position: 1
---

# CLI 参考

本节按命令组逐一介绍 Snoopy CLI。

## 顶层命令

- `job`
- `jobs`
- `add`
- `list`
- `delete [jobRef]`
- `start [jobRef]`
- `stop [jobRef]`
- `settings`
- `daemon`
- `startup`
- `reboot`
- `export`
- `consume [jobRef]`
- `analytics [jobRef]`
- `results [jobRef]`
- `logs [runId]`
- `errors [jobRef]`
- `doctor`

`<jobRef>` 接受任务 UUID 或标识符（slug）。

对于带有 `[jobRef]` 或 `[runId]` 的命令，在 TTY 模式下省略参数会启动交互式选择器。

## 各命令页面

- [Job 命令（`job`、`jobs`）](commands/job.md)
- [设置](commands/settings.md)
- [守护进程](commands/daemon.md)
- [开机启动（`startup`、`reboot`）](commands/startup.md)
- [导出](commands/export.md)
- [消费](commands/consume.md)
- [分析](commands/analytics.md)
- [结果](commands/results.md)
- [日志](commands/logs.md)
- [错误](commands/errors.md)
- [诊断](commands/doctor.md)

## 顶层别名

Snoopy 为常用操作提供了一些顶层快捷方式。

### `add`

`job add` 的别名。

```bash
snoopy add
```

### `list`

`jobs list` 的别名。

```bash
snoopy list
```

### `delete [jobRef]`

`job delete [jobRef]` 的别名。

```bash
snoopy delete
snoopy delete <jobRef>
```

### `start [jobRef]`

启用任务的别名。

```bash
snoopy start
snoopy start <jobRef>
```

### `stop [jobRef]`

禁用任务的别名。

```bash
snoopy stop
snoopy stop <jobRef>
```

## 典型操作流程

```bash
snoopy job add
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
snoopy job runs <jobRef>
snoopy analytics <jobRef>
snoopy results <jobRef>
snoopy export <jobRef> --json --last-run
snoopy consume <jobRef> --json --dry-run
snoopy logs
snoopy logs <runId>
snoopy errors <jobRef>
snoopy daemon start
snoopy doctor
```
