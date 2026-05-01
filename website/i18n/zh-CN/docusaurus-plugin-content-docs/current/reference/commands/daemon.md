---
title: daemon
sidebar_position: 6
---

# `daemon`

`daemon` 组管理长期运行的 Snoopy 调度进程。

## 子命令

### `daemon start`

在后台启动调度器。

```bash
snoopy daemon start
```

### `daemon stop`

停止后台守护进程。

```bash
snoopy daemon stop
```

### `daemon status`

显示守护进程是否正在运行以及 PID 文件是否正常。

```bash
snoopy daemon status
```

### `daemon reload`

重新加载运行中守护进程的调度注册信息，无需重启。

```bash
snoopy daemon reload
```

### `daemon run`

在前台运行守护进程。

```bash
snoopy daemon run
```

## 典型用法

```bash
snoopy daemon start
snoopy daemon status
snoopy daemon reload
```
