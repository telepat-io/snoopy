---
title: logs
sidebar_position: 8
---

# `logs [runId]`

使用 `logs` 命令以易于阅读的时间线形式（默认）查看某次运行。

```bash
snoopy logs
snoopy logs <runId>
snoopy logs <runId> --raw
```

若省略 `runId`，Snoopy 会先显示任务列表，让你通过上下箭头和回车键选择一个任务，然后显示该任务的最近运行记录，同样以交互方式让你选择一次运行。

默认模式（`snoopy logs <runId>`）显示：

- 运行元数据
- 帖子/评论文本摘要
- 合格与不合格项的审核结果及判定理由
- 可点击的帖子/评论链接
- 关键运行生命周期事件和错误

原始模式（`--raw`）显示：

- 完整的原始日志文件内容
- 详细的 Reddit/OpenRouter 请求和响应负载
- 所有生命周期条目，与写入磁盘时完全一致

说明：

- 运行日志存放于 `~/.snoopy/logs/` 目录下
- 文件命名格式为 `run-<runId>.log`
- 较早的运行记录如果早于详细运行日志功能的引入，可能没有对应的日志文件
- 不支持超链接的终端仍会显示完整 URL，方便复制
- 结果文件通过 `snoopy export` 单独导出到 `~/.snoopy/results/` 目录下
