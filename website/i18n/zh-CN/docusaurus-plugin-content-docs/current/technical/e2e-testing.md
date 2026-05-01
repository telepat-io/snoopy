---
title: E2E 冒烟测试
sidebar_position: 6
---

# E2E 冒烟测试指南

使用本指南验证核心流程：

1. 创建任务
2. 对 5 个新条目执行首次资格审查尝试
3. 验证首次运行前后的任务启用状态切换
4. 删除任务及相关分析数据

## 单命令冒烟测试

```bash
npm run e2e:smoke
```

该脚本：

- 验证所需的 OpenRouter 凭据是否存在
- 创建一个处于禁用状态的临时任务
- 执行与 `job add` 相同的首次运行编排
- 验证首次运行尝试后任务已启用，且存在运行记录行
- 在清理阶段删除任务

实现路径：

- `src/scripts/e2eSmoke.ts`

## 前提条件

运行冒烟测试前：

- OpenRouter API 密钥已通过 `snoopy settings`（密钥链可用时）或 `SNOOPY_OPENROUTER_API_KEY` 环境变量配置
- 可选：在未认证的 Reddit JSON 访问被阻止的环境中配置 Reddit OAuth 回退凭据

快速检查：

```bash
snoopy doctor
```

## 可选环境变量

- `SNOOPY_E2E_LIMIT` 默认值 `5`
- `SNOOPY_E2E_SUBREDDITS` 默认值 `startups,entrepreneur`
- `SNOOPY_E2E_KEEP_JOB` 默认值 `false`

示例：

```bash
SNOOPY_E2E_LIMIT=5 SNOOPY_E2E_SUBREDDITS=startups,entrepreneur npm run e2e:smoke
```

保留任务以供检查：

```bash
SNOOPY_E2E_KEEP_JOB=true npm run e2e:smoke
```

## 手动等效流程

如果你需要完全手动控制：

1. 创建任务：

```bash
snoopy job add
```

2. 运行 5 条测试：

```bash
snoopy job run <jobRef> --limit 5
```

3. 检查历史记录：

```bash
snoopy job runs <jobRef>
```

4. 删除并级联清理：

```bash
snoopy delete <jobRef>
```

## 正常输出的样子

- 运行完成且无错误。
- 使用 `--limit 5` 时，恰好处理 5 个新条目。
- 资格审查理由简洁且与任务提示词一致。
- 没有重复出现的回退理由，如 `Model output invalid; marked unqualified`。

## 故障排除

如果冒烟测试失败：

1. 运行 `snoopy doctor`。
2. 在 `settings` 或 `SNOOPY_OPENROUTER_API_KEY` 中验证 OpenRouter API 密钥。
3. 如果环境中 Reddit 访问被拒绝，在 `settings` 中配置 Reddit OAuth 回退凭据。
4. 如涉及守护进程，检查其状态（`daemon status`）。
5. 查看 `<root>/logs/snoopy.log` 中的日志。
6. 使用 `SNOOPY_E2E_KEEP_JOB=true` 重新运行以检查持久化数据。
