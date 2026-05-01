---
title: 快速开始
---

# 快速开始

本指南介绍验证 Snoopy 端到端功能的最简路径。

## 1. 创建任务

```bash
snoopy job add
```

## 2. 查看任务

```bash
snoopy jobs list
```

## 3. 运行小规模验证扫描

```bash
snoopy job run --limit 5
snoopy job run <jobRef> --limit 5
```

## 4. 检查结果

```bash
snoopy job runs <jobRef>
snoopy analytics <jobRef> --days 7
```

## 5. 启动后台调度

```bash
snoopy daemon start
snoopy startup status
```

## 6. 导出筛选结果

```bash
snoopy export
snoopy export <jobRef> --json --last-run
```

## 下一步

- 阅读[调度与开机自启](../guides/scheduling-and-startup.md)了解持久化运行。
- 使用 [CLI 参考](../reference/cli-reference.md)获取完整命令详情。
- 如果有任何异常，运行 [Doctor](../reference/commands/doctor.md)。
