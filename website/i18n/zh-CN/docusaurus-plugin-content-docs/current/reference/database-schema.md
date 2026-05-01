---
title: 数据库模式
sidebar_position: 3
---

# 数据库模式

Snoopy 使用本地 SQLite 数据库。

## 存储位置

路径模式：

- `<rootDir>/snoopy.db`

在所有支持的操作系统上，默认根目录为 `<home>/.snoopy`：

- macOS 示例：`~/.snoopy/snoopy.db`
- Linux 示例：`~/.snoopy/snoopy.db`
- Windows 示例：`C:\Users\<you>\.snoopy\snoopy.db`

默认路径（macOS/Linux）：

- `~/.snoopy/snoopy.db`

覆盖根目录：

- 设置 `SNOOPY_ROOT_DIR`

则数据库路径变为：

- `<SNOOPY_ROOT_DIR>/snoopy.db`

## 模式来源

- `src/services/db/migrations/` 中的 TypeScript 迁移模块
- 迁移执行器位于 `src/services/db/migrations/runner.ts`
- 数据库启动代码位于 `src/services/db/sqlite.ts`（仅 WAL 模式 + 调用执行器）

## 表

### settings

用途：

- 存储键值对形式的应用设置和凭证元数据

列：

- `key TEXT PRIMARY KEY`
- `value TEXT NOT NULL`
- `updated_at TEXT NOT NULL DEFAULT datetime('now')`

常用键：

- `model`
- `model_settings_json`
- `reddit_app_name`
- `reddit_client_id`

### jobs

用途：

- 定义监控任务

列：

- `id TEXT PRIMARY KEY`
- `slug TEXT UNIQUE`
- `name TEXT NOT NULL UNIQUE`
- `description TEXT NOT NULL`
- `qualification_prompt TEXT NOT NULL`
- `subreddits_json TEXT NOT NULL`
- `schedule_cron TEXT NOT NULL DEFAULT '*/30 * * * *'`
- `enabled INTEGER NOT NULL DEFAULT 1`
- `monitor_comments INTEGER NOT NULL DEFAULT 1`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`
- `updated_at TEXT NOT NULL DEFAULT datetime('now')`

索引：

- `idx_jobs_slug` 基于 `slug` 的唯一索引

说明：

- 命令接受任务 ID 或 slug。
- Slug 在仓库逻辑中生成并确保唯一。

### job_runs

用途：

- 存储每次计划/手动执行尝试

活动运行时模式中的列：

- `id TEXT PRIMARY KEY`
- `job_id TEXT NOT NULL`（外键关联 `jobs.id`）
- `status TEXT NOT NULL`（`running`、`completed`、`failed`、`skipped`）
- `message TEXT`
- `started_at TEXT`
- `finished_at TEXT`
- `items_discovered INTEGER NOT NULL DEFAULT 0`
- `items_new INTEGER NOT NULL DEFAULT 0`
- `items_qualified INTEGER NOT NULL DEFAULT 0`
- `prompt_tokens INTEGER NOT NULL DEFAULT 0`
- `completion_tokens INTEGER NOT NULL DEFAULT 0`
- `estimated_cost_usd REAL`
- `log_file_path TEXT`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`

说明：

- 迁移 001 初始化一个最小版本。
- 运行时启动时会为较旧的本地数据库添加更新的分析列。
- 当详细日志可用时，`log_file_path` 指向 `~/.snoopy/logs/` 下每次运行的日志文件。
- `idx_job_runs_active_job` 确保每个 `job_id` 最多有一行处于 `running` 状态，以防止运行重叠。

### scan_items

用途：

- 已扫描帖子/评论的去重存储及资格判定结果
- 支持下游自动化的轻量级结果生命周期追踪

列：

- `id TEXT PRIMARY KEY`
- `job_id TEXT NOT NULL`（外键关联 `jobs.id`）
- `run_id TEXT NOT NULL`（外键关联 `job_runs.id`）
- `type TEXT NOT NULL CHECK(type IN ('post','comment'))`
- `reddit_post_id TEXT NOT NULL`
- `reddit_comment_id TEXT`
- `subreddit TEXT NOT NULL`
- `author TEXT NOT NULL`
- `title TEXT`
- `body TEXT NOT NULL`
- `url TEXT NOT NULL`
- `reddit_posted_at TEXT NOT NULL`
- `qualified INTEGER NOT NULL DEFAULT 0`
- `viewed INTEGER NOT NULL DEFAULT 0`
- `validated INTEGER NOT NULL DEFAULT 0`
- `processed INTEGER NOT NULL DEFAULT 0`
- `consumed INTEGER NOT NULL DEFAULT 0`
- `qualification_reason TEXT`
- `created_at TEXT NOT NULL DEFAULT datetime('now')`

索引：

- `idx_scan_items_dedup` 基于 `(job_id, reddit_post_id, COALESCE(reddit_comment_id,''))` 的唯一索引
- `idx_scan_items_consumed` 基于 `(job_id, qualified, consumed, created_at DESC)` 的索引

行为：

- 防止每个任务重复处理相同的帖子/评论
- 存储最终资格判定原因以供审计
- 生命周期标志语义：
	- `viewed = 1` 结果已被操作员或代理审阅
	- `validated = 1` 结果已通过质量检查/接受
	- `processed = 1` 结果已移交至下游工作流
	- `consumed = 1` 结果已被 `consume` 命令返回，将不再出现

说明：

- SQLite 将布尔值存储为整数（`0` 表示 false，`1` 表示 true）。
- 较新的运行时版本在启动时会使用 `ALTER TABLE` 为较旧的本地数据库回填缺失的生命周期列。

### daemon_state

用途：

- 为守护进程生命周期保留的运行时状态表

列：

- `id INTEGER PRIMARY KEY CHECK (id = 1)`
- `is_running INTEGER NOT NULL`
- `updated_at TEXT NOT NULL DEFAULT datetime('now')`

### migrations

用途：

- 跟踪迁移执行器已应用的模式迁移

列：

- `id INTEGER PRIMARY KEY`
- `name TEXT NOT NULL`
- `applied_at TEXT NOT NULL DEFAULT datetime('now')`

说明：

- 由迁移执行器在首次访问数据库时自动创建
- 每行代表一个已应用的迁移模块
- `snoopy doctor` 报告待处理与已应用的迁移对比

## 删除与数据生命周期

通过 CLI/仓库删除任务会移除：

1. 该任务的 `scan_items` 行
2. 该任务的 `job_runs` 行
3. `job_runs.log_file_path` 引用的关联运行日志文件（如果存在）
4. `jobs` 行本身

此删除操作在仓库逻辑中以数据库事务方式执行。

## 查询示例

某个任务的最新运行记录：

```sql
SELECT *
FROM job_runs
WHERE job_id = ?
ORDER BY created_at DESC
LIMIT 20;
```

某次运行的最新合格项目：

```sql
SELECT reddit_post_id, reddit_comment_id, qualified, qualification_reason
FROM scan_items
WHERE run_id = ?
ORDER BY created_at DESC;
```

某个任务中未处理的合格项目：

```sql
SELECT
	id,
	url,
	author,
	title,
	qualification_reason,
	viewed,
	validated,
	processed,
	reddit_posted_at
FROM scan_items
WHERE job_id = ?
	AND qualified = 1
	AND processed = 0
ORDER BY datetime(reddit_posted_at) DESC;
```

将一条结果标记为已查看 + 已验证：

```sql
UPDATE scan_items
SET viewed = 1,
		validated = 1
WHERE id = ?;
```

批量将某次运行的合格结果标记为已处理：

```sql
UPDATE scan_items
SET processed = 1
WHERE run_id = ?
	AND qualified = 1;
```

## Agent 工作流参考

有关端到端的直接数据库工作流（列出任务、插入任务、验证守护进程/启动状态、运行任务、读取/更新结果），请参见 [Agent 操作](../guides/agent-operations.md)。
