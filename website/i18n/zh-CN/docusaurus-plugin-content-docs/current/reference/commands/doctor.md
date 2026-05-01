---
title: doctor
sidebar_position: 10
---

# `doctor`

`doctor` 命令对本地 Snoopy 环境运行快速健康检查。

```bash
snoopy doctor
```

## 当前检查项

- 平台和 Node 版本
- SQLite 数据库可达性
- OpenRouter API 密钥是否存在
- 任务总数/已启用任务数
- 守护进程健康状态
- 启动注册状态及注册方式
- 最近 24 小时内失败的作业运行记录或错误日志

## 修复建议

当某项检查未通过时，`doctor` 会输出建议的修复命令：

| 问题 | 建议修复 |
|---|---|
| 守护进程未运行 | `snoopy daemon start` |
| 缺少 OpenRouter API 密钥 | `snoopy settings` |
| 数据库不可达 | 检查显示的数据库文件路径 |
| 最近有运行错误 | `snoopy job` / `snoopy logs <runId>` |

## 典型用法

在以下场景后运行 `doctor`：

- 初次安装
- 更换凭证
- 启用启动注册
- 守护进程异常
- 冒烟测试失败
