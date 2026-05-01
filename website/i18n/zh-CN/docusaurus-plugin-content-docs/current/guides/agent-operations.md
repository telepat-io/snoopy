---
title: Agent 操作指南
sidebar_position: 7
---

# Agent 操作指南

:::tip 新增：For Agents 章节
关于 MCP 服务器设置、Agent 框架注册和技能包，请参阅 [For Agents](../for-agents/index.md) 章节。本指南涵盖完整的 CLI 操作手册和直接数据库访问模式。
:::

本指南面向端到端操作 Snoopy 的 AI Agent 和自动化脚本。涵盖安装、凭证设置、所有可用命令以及 CLI 不足以应对时的直接数据库访问模式。

---

## 1. 安装

**运行环境要求：** Node.js 20+、npm 10+

**通过 npm 安装（生产环境推荐）：**

```bash
npm install -g @telepat/snoopy
snoopy --help
```

**源码安装（开发/自定义构建）：**

```bash
npm install
npm run build
npm link
snoopy --help
```

**验证安装：**

```bash
snoopy --version
snoopy --help
```

数据目录在首次运行时自动创建，位于 `~/.snoopy/`（macOS 和 Linux）或 `C:\Users\<you>\.snoopy\`（Windows）。

设置 `SNOOPY_ROOT_DIR` 可完全覆盖数据目录位置：

```bash
SNOOPY_ROOT_DIR=/custom/path snoopy doctor
```

---

## 2. 凭证

### OpenRouter API Key（必需）

Snoopy 使用 [OpenRouter](https://openrouter.ai) 根据您的任务提示词对 Reddit 帖子和评论进行资格判定。没有 API Key，任务运行将失败。

**存储方式：** Key 通过 `keytar` 保存到系统钥匙串（macOS Keychain、Linux Secret Service、Windows Credential Manager）。如果钥匙串存储不可用，请通过 `SNOOPY_OPENROUTER_API_KEY` 环境变量提供 Key。

**交互式设置 Key：**

```bash
snoopy settings
```

导航到 **OpenRouter API Key**，输入您的 Key 并保存。

当钥匙串存储可用时，首次运行 `snoopy job add` 也会自动提示输入 Key。
如果钥匙串存储不可用，请在运行 `snoopy job add` 之前设置 `SNOOPY_OPENROUTER_API_KEY`。

**验证 Key 已配置：**

```bash
snoopy doctor
```

在输出中查找 `OpenRouter API key: configured`。

### Reddit 凭证（可选）

Snoopy 默认使用 Reddit 的公开 API。如果需要使用 OAuth 凭证（用于更高的速率限制或访问私有 subreddit），请通过 `snoopy settings` 配置：

- **Reddit App Name**
- **Reddit Client ID**
- **Reddit Client Secret**

这些是可选的，仅在特定部署场景中需要。

---

## 3. 首次设置

最快速的系统启动流程：

```bash
# 1. 安装（如果尚未完成）
npm install -g @telepat/snoopy

# 2. 创建您的第一个监控任务
#    如果尚未设置，会提示输入 OpenRouter Key，
#    然后引导完成任务配置、启动守护进程并执行初始扫描。
snoopy job add

# 3. 验证一切正常运行
snoopy doctor
```

或者，在创建任务之前先设置 API Key：

```bash
snoopy settings    # 先设置 OpenRouter API Key
snoopy job add     # 然后创建任务
```

在不支持钥匙串的环境中：

```bash
export SNOOPY_OPENROUTER_API_KEY=<your-openrouter-key>
export SNOOPY_REDDIT_CLIENT_SECRET=<optional-reddit-client-secret>
snoopy job add
```

---

## 4. 任务管理

**任务（job）** 定义了 Snoopy 监控的内容：监控哪些 subreddit、什么样的帖子或评论算合格以及扫描频率。

本节中的 `<jobRef>` 接受任务 **ID** 或 **slug**。

### 创建任务

```bash
snoopy job add
# 简写别名：
snoopy add
```

交互式流程 — 收集：
- 任务名称和描述
- 目标 subreddit
- 资格判定提示词（用自然语言描述 AI 判定标准）
- 模型设置（model、temperature、max tokens、topP）
- 是否同时监控评论
- 是否注册开机自启
- 是否立即触发首次扫描

任务创建后处于**禁用**状态，直到首次运行完成。调度器随后会自动激活它。

### 列出任务

```bash
snoopy job list
# 别名：
snoopy jobs list
snoopy list
```

显示所有任务及其状态（开/关）、ID、slug 和 subreddit。

### 启用/禁用调度

```bash
snoopy job enable <jobRef>    # 别名：snoopy start <jobRef>
snoopy job disable <jobRef>   # 别名：snoopy stop <jobRef>
```

切换后，发送守护进程重载信号使更改立即生效，无需重启：

```bash
snoopy daemon reload
```

### 立即运行任务

```bash
snoopy job run <jobRef>
snoopy job run <jobRef> --limit 5   # 限制合格的新条目数量（适合冒烟测试）
# 别名：
snoopy jobs run <jobRef>
```

选项：
- `-l, --limit <count>` — 本次运行中最多判定为合格的帖子/评论数量（正整数）

输出包括：运行 ID、发现/新增/合格的条目数、Token 用量、预估费用（美元）、日志文件路径。

### 查看运行历史

```bash
snoopy job runs             # 所有任务的最近运行记录
snoopy job runs <jobRef>    # 单个任务的运行记录（最多显示最近的 20 条）
```

每条运行记录卡片显示：运行 ID、状态、耗时、发现/新增/合格条目数、Token、费用、日志路径。

### 删除任务

```bash
snoopy job delete <jobRef>
# 别名：
snoopy job remove <jobRef>
# 简写别名：
snoopy delete <jobRef>
```

**级联删除：** 在单个数据库事务中删除所有 `scan_items`、所有 `job_runs`、所有运行日志文件以及任务记录本身。

---

## 5. 守护进程生命周期

守护进程在后台运行，按 cron 调度执行任务。

```bash
snoopy daemon start     # 在后台启动守护进程；将 PID 写入 ~/.snoopy/.pid
snoopy daemon stop      # 向守护进程发送 SIGTERM；删除 PID 文件
snoopy daemon status    # 检查守护进程是否在运行（并显示 PID）
snoopy daemon reload    # 发送 SIGUSR2 以热重载任务调度，无需重启
snoopy daemon run       # 在前台运行守护进程（适合调试/查看日志）
```

**典型的 Agent 操作模式：**

```bash
# 确保守护进程正在运行
snoopy daemon status || snoopy daemon start

# 启用/禁用任务后，重载调度
snoopy daemon reload
```

---

## 6. 开机自启

注册 Snoopy 在机器重启或用户登录时自动启动。

```bash
snoopy startup enable     # 安装并启用开机自启注册
snoopy startup disable    # 移除开机自启注册
snoopy startup status     # 显示当前开机自启状态和方式
```

别名（等效命令）：

```bash
snoopy reboot enable
snoopy reboot disable
snoopy reboot status
```

平台特定实现：
- **macOS** — LaunchAgent plist（`~/Library/LaunchAgents/`）
- **Linux** — systemd 用户服务或 cron 条目
- **Windows** — 任务计划程序条目

**典型的 Agent 操作模式：**

```bash
snoopy startup status || snoopy startup enable
```

---

## 7. 健康检查 — doctor

`snoopy doctor` 是验证系统完全正常运行的权威方式。

```bash
snoopy doctor
```

输出涵盖：
- 平台和 Node.js 版本
- 数据库位置和可访问性
- OpenRouter API Key：已配置/缺失
- 任务总数及已启用数量
- 守护进程：运行中（含 PID）或已停止
- 开机自启：已启用/已禁用及方式
- 最近任务错误：过去 24 小时内失败或出错的任务运行及其诊断信息

**Agent 的修复流程：**

```bash
snoopy doctor
# 如果 API Key 缺失：         snoopy settings
# 如果守护进程未运行：         snoopy daemon start
# 如果开机自启未注册：         snoopy startup enable
```

---

## 8. 错误与日志

### 查看任务的最近错误

```bash
snoopy errors <jobRef>              # 默认：最近 24 小时
snoopy errors <jobRef> --hours 48   # 延长时间窗口
```

输出：
- 时间窗口内失败的任务运行和记录了错误的运行
- 运行日期时间、状态、运行 ID、状态消息
- 最新错误条目以完整详情输出

### 查看任务的原始日志

```bash
snoopy logs <runId>
```

流式输出指定运行的完整原始日志文件。日志包含每个生命周期步骤的 JSON 事件负载：请求、响应、资格判定结果、错误。

**日志存储：**
- 位置：`~/.snoopy/logs/run-<runId>.log`
- **5 天后**自动删除

---

## 9. 统计分析

```bash
snoopy analytics                     # 所有任务，最近 30 天（默认）
snoopy analytics --days 7            # 所有任务，自定义时间窗口
snoopy analytics <jobRef>            # 单个任务
snoopy analytics <jobRef> --days 90  # 单个任务，延长的时间窗口
```

输出指标：
- 运行次数和时间窗口大小
- 发现、新增和合格的条目总数
- 提示词/补全/总计 Token 的总量和平均值
- 预估费用的总量和平均值（美元）
- 每条帖子的 Token 消耗、每条帖子的费用
- 按 subreddit 分类的明细（帖子、评论、Token、费用、日均值）
- 包含完整详情的单次运行记录卡片

---

## 10. 导出合格结果

导出合格的扫描条目以供下游处理，无需直接查询 SQLite。

```bash
snoopy export <jobRef> --json --last-run           # 单个任务，仅最近一次运行
snoopy export --json --last-run                    # 所有任务，各取最近一次运行
snoopy export <jobRef> --json --last-run --limit 500  # 需要时提高行数上限
snoopy export <jobRef> --csv                       # CSV 格式输出（默认格式）
```

输出文件写入 `~/.snoopy/results/<timestamp>_<job-slug>.<ext>`，其中 timestamp 为 UTC 格式 `YYYYMMDD-HHmmss`。每次调用都会从数据库重新生成文件（非增量）。命令在完成后打印行数和文件路径。

对于 Agent，建议使用 `--json --last-run` 以机器友好的格式仅获取最新运行的合格条目。这样无需直接读取数据库，同时保持自动化的确定性。

---

## 11. 设置参考

```bash
snoopy settings
```

所有设置存储在数据库中（`settings` 表）。机密信息（API Key、Reddit Client Secret）存储在系统钥匙串或加密的备用文件中。

| 设置项 | 默认值 | 说明 |
|---|---|---|
| OpenRouter API Key | （必需） | 存储在系统钥匙串/加密文件中 |
| Default Model | `moonshotai/kimi-k2.5` | 用于资格判定的 LLM 模型 |
| Temperature | `0.0` | 范围 0.0–2.0 |
| Max Tokens | — | 每个请求的 Token 限制 |
| Top P | — | 核采样，范围 0.0–1.0 |
| Scan Interval | `30`（分钟） | 转换为 `*/N * * * *` cron 表达式 |
| Job Timeout | `10`（分钟） | 每个任务运行的超时时间；0 = 无超时 |
| Desktop Notifications | `true` | 运行事件的操作系统通知 |
| Reddit App Name | （可选） | OAuth 备用 |
| Reddit Client ID | （可选） | OAuth 备用 |
| Reddit Client Secret | （可选） | 存储在系统钥匙串/加密文件中 |

---

## 12. 数据库直接访问（附录）

对于无法使用交互式 CLI 的自动化场景，大多数读取和生命周期标志更新可以直接操作 SQLite 数据库。

**数据库位置：**

```
~/.snoopy/snoopy.db                          # 默认（macOS / Linux）
C:\Users\<you>\.snoopy\snoopy.db             # 默认（Windows）
$SNOOPY_ROOT_DIR/snoopy.db                   # 设置覆盖后的路径
```

**使用 sqlite3 打开：**

```bash
sqlite3 ~/.snoopy/snoopy.db
```

### 列出任务

```sql
SELECT id, slug, name, enabled, monitor_comments, schedule_cron, created_at
FROM jobs
ORDER BY datetime(created_at) DESC;
```

- `enabled = 1` → 调度器将运行该任务
- `monitor_comments = 1` → 评论资格判定已激活

### 直接插入任务（非交互式）

```sql
INSERT INTO jobs (
  id, slug, name, description,
  qualification_prompt, subreddits_json,
  schedule_cron, enabled, monitor_comments,
  created_at, updated_at
) VALUES (
  lower(hex(randomblob(16))),
  'lead-monitor-saas',
  'Lead Monitor SaaS',
  'Track high-intent SaaS buying questions',
  'Qualify only if the user is actively seeking SaaS recommendations or alternatives.',
  '["startups","entrepreneur","SaaS"]',
  '*/30 * * * *',
  1, 1,
  datetime('now'), datetime('now')
);
```

- `slug` 必须唯一（`idx_jobs_slug`）。
- `subreddits_json` 必须是有效的 JSON 数组字符串。
- 多语句写入请使用 `BEGIN TRANSACTION; ... COMMIT;`。

### 读取任务的最近运行记录

```sql
SELECT
  id, status, message,
  started_at, finished_at,
  items_discovered, items_new, items_qualified,
  prompt_tokens, completion_tokens, estimated_cost_usd,
  created_at
FROM job_runs
WHERE job_id = '<job-id>'
ORDER BY datetime(created_at) DESC
LIMIT 20;
```

### 获取任务的合格结果

```sql
SELECT
  id, run_id, type, subreddit, author,
  title, url, body,
  qualified, qualification_reason,
  viewed, validated, processed,
  reddit_posted_at, created_at
FROM scan_items
WHERE job_id = '<job-id>'
  AND qualified = 1
ORDER BY datetime(reddit_posted_at) DESC, datetime(created_at) DESC;
```

### 更新结果生命周期标志

```sql
-- 将某个条目标记为已审核且已验证
UPDATE scan_items
SET viewed = 1, validated = 1
WHERE id = '<item-id>';

-- 将某次运行中所有合格的条目标记为已处理
UPDATE scan_items
SET processed = 1
WHERE run_id = '<run-id>'
  AND qualified = 1;

-- 统计某个任务未处理的合格积压数量
SELECT COUNT(*) AS unprocessed_qualified
FROM scan_items
WHERE job_id = '<job-id>'
  AND qualified = 1
  AND processed = 0;
```

**生命周期标志语义：**
- `viewed = 1` — 结果已被运营人员或 Agent 审核
- `validated = 1` — 结果已经过质量检查并确认接受
- `processed = 1` — 结果已移交给下游工作流处理

完整的表结构（包括所有列、索引和约束），请参阅 [Database Schema](../reference/database-schema.md)。

---

## 13. Agent 最小化操作手册

1. 安装 snoopy 并确认 `snoopy --help` 正常工作。
2. 运行 `snoopy doctor` — 解决显示的任何问题（缺失 Key、守护进程停止、开机自启未注册）。
3. 使用 `snoopy job add` 创建任务（或直接在数据库中插入以用于非交互式设置）。
4. 确认守护进程正在运行：`snoopy daemon status` → 如果没有，执行 `snoopy daemon start`。
5. 确认开机自启已注册：`snoopy startup status` → 如果没有，执行 `snoopy startup enable`。
6. 触发测试运行：`snoopy job run <jobRef> --limit 5`。
7. 检查结果：`snoopy job runs <jobRef>` 和 `snoopy errors <jobRef>`。
8. 根据需要导出或查询合格结果。
9. 随着工作流推进更新生命周期标志（`viewed`、`validated`、`processed`）。
