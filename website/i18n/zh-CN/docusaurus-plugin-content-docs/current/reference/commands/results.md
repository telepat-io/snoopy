---
title: Results
sidebar_position: 8
---

# Results

在交互式 TUI 查看器中浏览某个任务的扫描项（符合资格和不符合资格）。

## 命令

```bash
snoopy results [jobRef]
```

- `<jobRef>` 接受任务 UUID 或别名。
- 如果在 TTY 模式下省略，Snoopy 会提示你选择任务。

## 行为

- 结果按从新到旧排序。
- 包含符合资格和不符合资格的项目。
- 帖子类项目显示标题和正文内容。
- 评论类项目在可用时显示从根评论到目标评论的存储线程链。

## 按键

- `←` / `→`：上一条/下一条结果项
- `↑` / `↓`：在当前项目内容中上下滚动
- `q` 或 `Esc`：退出

## 显示的字段

- 项目类型（`post` 或 `comment`）
- 资格状态和判定理由
- Subreddit 和发布作者
- 原始内容链接
- 发布用户资料链接
- 发布时间戳
- Run ID 和 Scan Item ID
- 生命周期标记（`viewed`、`validated`、`processed`）
- Token/费用元数据

## 说明

- 在非富终端中，Snoopy 会回退到纯文本输出。
- 较早的评论记录可能不包含存储的线程谱系；对于这些记录，Snoopy 将显示 `Thread unavailable for this item.`。
