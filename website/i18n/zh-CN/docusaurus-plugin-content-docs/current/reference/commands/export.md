---
title: export
sidebar_position: 8
---

# `export`

使用 `export` 从本地数据库重新生成数据构件。

## `export [jobRef]`

重新生成每个任务的导出文件，包含符合资格的结果。

```bash
snoopy export
snoopy export <jobRef>
snoopy export --csv
snoopy export --json
snoopy export <jobRef> --json --last-run
```

参数：

- `[jobRef]`：可选的任务 ID 或别名

选项：

- `--csv`：以 CSV 格式导出（默认）
- `--json`：以原始 JSON 格式导出
- `--last-run`：仅导出每个任务最近一次运行的行
- `--limit <count>`：每个任务文件写入的最大行数（默认：`100`）

行为：

- 不指定 `jobRef` 时，导出所有任务
- 指定 `jobRef` 时，仅导出单个任务
- 每个任务写入到 `~/.snoopy/results/<timestamp>_<job-slug>.<ext>`
- 时间戳格式为 UTC 紧凑格式：`YYYYMMDD-HHmmss`
- 每次命令运行都从数据库完全重新生成文件
- 行顺序为新到旧（最近发布的在前）
- `--last-run` 将行范围限定为每个选定任务的最新一次运行
- `--limit` 限制每个文件的行数；当任务有大量符合资格的结果时可增大此值

CSV 列：

- `URL`
- `Title`
- `Truncated Content`（300 字符 + 超出时显示 `...`）
- `Author`
- `Justification`
- `Date`

JSON 格式：

- 来自 `scan_items` 的符合资格行对象数组
- 包含的字段有：`id`、`jobId`、`runId`、`author`、`title`、`body`、`url`、`redditPostedAt`、`qualificationReason`、`createdAt`

说明：

- 此命令是手动的；任务运行不会自动写入导出文件
- 删除任务不会追溯移除之前导出的带时间戳的文件
