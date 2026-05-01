---
title: errors
sidebar_position: 9
---

# `errors [jobRef]`

使用 `errors` 命令显示某个任务最近的失败或出错运行。

```bash
snoopy errors
snoopy errors <jobRef>
snoopy errors <jobRef> --hours 48
```

参数：

- `[jobRef]`：可选的任务 ID 或别名

选项：

- `--hours <count>`：向前追溯的小时数，默认为 `24`

显示内容：

- 状态为 `failed` 的运行
- 日志文件中包含 `[ERROR]` 条目的运行
- 每个匹配运行中的最新错误块

若省略 `jobRef`，Snoopy 会显示所有任务，让你通过上下箭头和回车键选择一个。

典型用法：

- 排查某个异常任务
- 确认某个守护进程运行的任务最近是否失败
- 在打开完整的 `logs <runId>` 输出之前，先查看最近的失败情况

## 相关运行状态

- 如果某个任务已有处于活动状态的 `running` 行，新的 `job run` 尝试将被记录为 `skipped`，并附带 `already active` 消息。
- 重复的扫描候选项（相同的任务 + 帖子/评论身份）将被视为已有项，不会导致运行失败。
