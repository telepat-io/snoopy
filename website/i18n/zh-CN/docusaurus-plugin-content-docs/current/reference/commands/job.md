---
title: job
sidebar_position: 2
---

# `job`

使用 `job` 创建、查看、运行、启用、禁用和删除监控任务。

复数形式 `jobs` 组是相同操作命令的别名。

## 别名

以下命令与其对应的 `job` 命令行为一致：

- `jobs list`
- `jobs enable [jobRef]`
- `jobs disable [jobRef]`
- `jobs remove [jobRef]`
- `jobs delete [jobRef]`
- `jobs run [jobRef] [--limit N]`
- `jobs runs [jobRef]`

示例：

```bash
snoopy jobs list
snoopy jobs run my-job --limit 5
snoopy jobs delete my-job
```

## 子命令

### `job add`

启动交互式任务创建流程。

```bash
snoopy job add
```

执行以下操作：

- 收集自然语言描述的监控意图
- 询问后续问题
- 生成名称、别名、描述和资格判定提示词
- 在需要时提示填写缺失的凭据/设置
- 询问是否注册系统重启/登录时自动启动（默认为是）
- 将任务保存到本地
- 立即执行首次扫描，进度和摘要输出与 `job run` 一致
- 首次运行期间任务保持未调度状态，运行结束后启用定时调度

如果在初始运行期间使用 Ctrl+C 中断，Snoopy 会在退出前启用该任务，以便 cron 调度可以继续。

### `job list`

列出所有已配置的任务。

```bash
snoopy job list
```

### `job remove [jobRef]`
### `job delete [jobRef]`

删除一个任务，并级联清理相关的运行记录、扫描项、运行日志文件和已导出的 CSV 文件。

```bash
snoopy job delete
snoopy job delete <jobRef>
```

如果省略 `jobRef`，Snoopy 会显示所有任务，让你通过上下箭头和 Enter 键选择其一。

当启用了详细运行日志时，删除任务也会移除 `~/.snoopy/logs/` 下对应的 `run-<runId>.log` 文件。

删除任务也会移除 `~/.snoopy/results/<job-slug>.csv` 下的结果文件（如果存在）。

### `job enable [jobRef]`
### `job disable [jobRef]`

启用或禁用定时执行。

```bash
snoopy job enable
snoopy job enable <jobRef>
snoopy job disable
snoopy job disable <jobRef>
```

如果省略 `jobRef`，Snoopy 会显示所有任务，让你通过上下箭头和 Enter 键选择其一。

### `job run [jobRef] [--limit N]`

立即运行一个任务。

参数：

- `[jobRef]`：可选的任务 ID 或别名

选项：

- `-l, --limit <count>`：运行期间最多判定资格的新帖子/评论数量

```bash
snoopy job run
snoopy job run <jobRef>
snoopy job run <jobRef> --limit 5
```

如果省略 `jobRef`，Snoopy 会显示所有任务，让你通过上下箭头和 Enter 键选择其一。

输出说明：

- 富终端渲染器将帖子/评论扫描更新显示为带有缩进字段的紧凑多行块。
- 标签经过着色以提高可读性。
- 资格状态有颜色编码：`qualified`（绿色）、`not qualified`（红色）、`pending`（黄色）。
- 如果同一任务已有其他运行正在进行，Snoopy 会快速失败并将新尝试标记为 `skipped`，并显示 `already active` 消息。
- 在重叠窗口期间发现的重复帖子/评论候选视为已扫描，不会导致运行失败。

### `job runs [jobRef]`

列出最近的运行历史记录。

如果省略 `jobRef`，此命令返回所有任务的最近运行记录。

```bash
snoopy job runs
snoopy job runs <jobRef>
```

`job runs` 仅显示运行历史。要重新生成每个任务的结果文件，请运行：

```bash
snoopy export
snoopy export <jobRef> --json --last-run
```
