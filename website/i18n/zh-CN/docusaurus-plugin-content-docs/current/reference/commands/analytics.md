---
title: analytics
sidebar_position: 8
---

# analytics

使用 analytics 查看全局或单个任务范围内的扫描量和 AI 使用指标。

## 用法

```bash
snoopy analytics
snoopy analytics <jobRef>
snoopy analytics --days 7
snoopy analytics <jobRef> --days 14
```

参数：

- `<jobRef>`：可选的任务 ID 或别名

选项：

- `-d, --days <count>`：回溯最近多少天（默认：30）

## 显示内容

全局模式（`snoopy analytics`）：

- 系统总计：新帖子/评论扫描数
- prompt/completion/total token 使用量
- 预估总费用
- 帖子/评论/token/费用的日均值
- 按任务和按 subreddit 的细分
- 最近的运行卡片，含耗时、每次运行的新帖子/评论数、token 总量、费用以及每帖比值

任务模式（`snoopy analytics <jobRef>`）：

- 该单个任务的总计和均值
- 该任务按 subreddit 的细分
- 该任务的最近运行记录

费用值标注为预估值，使用 Snoopy 当前的静态 token 定价启发式算法。
