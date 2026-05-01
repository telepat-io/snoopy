---
title: consume
sidebar_position: 9
---

# `consume`

使用 `consume` 列出未消费的符合资格结果，并将它们标记为已消费，以便不再返回。

## `consume [jobRef]`

列出最近未消费的符合资格结果，然后将它们标记为已消费。

```bash
snoopy consume
snoopy consume <jobRef>
snoopy consume --limit 10
snoopy consume <jobRef> --json
snoopy consume --json --dry-run
```

参数：

- `[jobRef]`：可选的任务 ID 或别名

选项：

- `--limit <count>`：返回结果的最大数量（默认：所有未消费的）
- `--json`：输出原始 JSON 数组到 stdout，而非可读列表
- `--dry-run`：预览结果但不将其标记为已消费

行为：

- 不指定 `jobRef` 时，返回所有任务的未消费结果
- 指定 `jobRef` 时，仅返回该任务的未消费结果
- 结果按从新到旧排序（最近创建的在前）
- 显示后，返回的行在数据库中被标记为 `consumed = 1`
- 后续调用将跳过已消费的结果
- 当使用 `--json` 且没有结果时，输出空数组 `[]`

JSON 格式：

- 来自 `scan_items` 的符合资格行对象数组
- 包含的字段有：`id`、`jobId`、`runId`、`author`、`title`、`body`、`url`、`redditPostedAt`、`qualificationReason`、`createdAt`、`consumed`

说明：

- 此命令是 `export` 的一次性读取对应命令；使用 `export` 进行按需文件生成
- `--dry-run` 对希望在使用前预览的代理或脚本很有用
- `consumed` 标记与 `viewed`、`validated` 和 `processed` 相互独立
