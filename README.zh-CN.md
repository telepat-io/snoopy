<p align="center"><img src="./assets/avatar/snoopy-logo.webp" width="128" alt="Snoopy"></p>
<h1 align="center">Snoopy</h1>
<p align="center"><em>使用 AI 监控在线对话中的高意向信号——自然语言标准，持续扫描，零基础设施。</em></p>

<p align="center">
  <a href="https://docs.telepat.io/snoopy">📖 文档</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
  · <a href="./README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/snoopy/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/snoopy/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/snoopy"><img src="https://codecov.io/gh/telepat-io/snoopy/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/snoopy"><img src="https://img.shields.io/npm/v/@telepat/snoopy" alt="npm"></a>
  <a href="https://github.com/telepat-io/snoopy/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Snoopy 监控在线对话中的高意向信号，匹配您的业务目标。

用自然语言定义您关心的内容，让 Snoopy 创建监控任务，持续扫描和评估对话，让您专注于回复和外联。

专为需要发现真正机会而无需手动浏览在线社区的创始人、营销人员和销售团队打造。

## 功能特性

- **自然语言任务创建** — 用自然语言描述您正在寻找的内容。Snoopy 构建 AI 辅助的监控任务。无需正则表达式，无需关键字配置。
- **AI 评估，而非关键词匹配** — 对话会对照您的意图进行评估。Snoopy 理解上下文——不仅仅是模式匹配。
- **反馈驱动的提示词进化** — 审阅结果、提交有效/无效反馈，并执行 consolidate，让评估提示词随时间持续优化。
- **持续守护进程监控** — 设置 cron 计划，让 Snoopy 在后台扫描。`snoopy daemon start`
- **代码驱动的高效率** — 确定性代码处理数据抓取、调度、状态管理和 SQLite 持久化。Token 仅用于评估。
- **本地化与隐私保护** — SQLite 数据库存储在您的机器上。无云依赖。按需导出为 CSV 或 JSON。
- **成本感知分析** — 每次运行的 Token 使用量、成本估算和符合条件的项目。`snoopy analytics --days 7`
- **智能体与 CI 就绪** — MCP 服务器、直接 SQLite 访问、非交互模式、机器可读输出。
- **跨平台** — macOS、Linux、Windows。支持开机自启。`snoopy startup install`

## 快速开始

环境要求：Node.js 20+、npm 10+。

```bash
npm install -g @telepat/snoopy
```

1. 创建第一个监控任务：

```bash
snoopy job add
```

2. 运行快速测试扫描：

```bash
snoopy job run --limit 5
```

3. 启动后台守护进程：

```bash
snoopy daemon start
```

4. 查看结果：

```bash
snoopy results
snoopy export --json --last-run
```

完整入门流程请参阅[安装与设置](https://docs.telepat.io/snoopy/getting-started/installation)和[快速开始](https://docs.telepat.io/snoopy/getting-started/quickstart)。

## 环境要求

- Node.js 20+
- npm 10+
- macOS、Linux 或 Windows

## 工作原理

Snoopy 使用 Reddit 公开 JSON 端点（可选 OAuth 回退）扫描帖子和评论，并通过 AI 辅助的评估提示进行匹配。结果存储在本地 SQLite 数据库中。内置守护进程按 cron 表达式运行任务，结果可按需导出为 CSV 或 JSON。

## 与 AI Agent 一起使用

Snoopy 专为无界面自动化和智能体驱动的监控设计：

- **非交互式 CLI** — 大多数命令支持省略 `<jobRef>` 以交互式选择，但自动化可以直接传入 ref 实现零提示执行。
- **机器可读输出** — `snoopy export --json --last-run` 和 `snoopy consume --json` 生成结构化数据，供下游智能体消费。
- **持续质量反馈闭环** — 智能体可执行 `snoopy feedback review --json`，收集人工反馈后调用 `snoopy feedback submit`，最后执行 `snoopy feedback consolidate`。
- **直接数据库访问** — SQLite 位于 `~/.snoopy/snoopy.db`（或 `$SNOOPY_ROOT_DIR/snoopy.db`），拥有完整文档化的 schema。智能体可以直接插入任务、查询结果并更新生命周期标志。
- **环境变量** — `TELEPAT_OPENROUTER_KEY`、`SNOOPY_REDDIT_CLIENT_SECRET` 和 `SNOOPY_ROOT_DIR` 可移除所有交互式凭证提示。
- **Agent 文档** — [Agent Operations](https://docs.telepat.io/snoopy/guides/agent-operations) 提供完整的自动化手册，包括 SQL schema、生命周期标志和推荐工作流。

## 反馈工作流

使用反馈命令持续提升评估质量：

```bash
# 1）审阅未验证的合格结果（适合智能体的 JSON）
snoopy feedback review --json --limit 10

# 2）逐条提交反馈
snoopy feedback submit <resultId> --valid
snoopy feedback submit <resultId> --invalid --reason "这不是实际购买意图"

# 3）合并反馈并更新评估提示词
snoopy feedback consolidate
```

在交互式 `snoopy feedback review` 中，若提前退出会提示是否先执行 consolidate。

## 安全与信任

- 密钥默认保存在 OS 钥匙串中（通过 `keytar`）。如果钥匙串不可用，则回退到加密文件。
- 环境变量会覆盖已存储的密钥，推荐用于 CI 和容器化环境。
- Reddit OAuth 凭证为可选；默认使用公开 JSON 端点。
- 运行日志超过 5 天会自动删除。

如需报告安全问题，请通过仓库安全报告通道私下提交。

## 文档与支持

- [文档站点](https://docs.telepat.io/snoopy)
- [安装与设置](https://docs.telepat.io/snoopy/getting-started/installation)
- [快速开始](https://docs.telepat.io/snoopy/getting-started/quickstart)
- [CLI 参考](https://docs.telepat.io/snoopy/reference/cli-reference)
- [Agent Operations](https://docs.telepat.io/snoopy/guides/agent-operations)
- [调度与守护进程](https://docs.telepat.io/snoopy/guides/scheduling-and-startup)
- [安全](https://docs.telepat.io/snoopy/technical/security)
- [仓库](https://github.com/telepat-io/snoopy)
- [npm 包](https://www.npmjs.com/package/@telepat/snoopy)

## 贡献

欢迎贡献。请参阅[开发指南](https://docs.telepat.io/snoopy/contributing/development)了解环境搭建、工作流和质量门禁。

## 许可证

MIT。详见 [LICENSE](./LICENSE)。
