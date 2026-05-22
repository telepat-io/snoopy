---
slug: /features
title: "在任何在线社区中发现高意向对话"
description: Snoopy 能为创始人、营销人员和销售团队做什么。
keywords: [snoopy, 功能, 对话监控, AI 评估, 线索生成]
sidebar_label: 功能
sidebar_position: 1
---

# 在任何在线社区中发现高意向对话

Snoopy 监控在线对话中的高意向信号，匹配您的业务目标。用自然语言定义您关心的内容，Snoopy 持续扫描和评估对话，让您专注于回复和外联。

专为需要发现真正机会而无需手动浏览和判断每条帖子的创始人、营销人员和销售团队打造。

---

## 自然语言任务定义

用自然语言描述您正在寻找的内容。Snoopy 从您的标准中构建出 AI 辅助的监控任务——无需正则表达式，无需关键字配置，无需布尔过滤器。只需告诉它您关心的内容。

```bash
snoopy job add
```

Snoopy 会提出澄清问题，优化您的标准，并生成一个即可运行的监控任务。

---

## AI 评估，而非关键词匹配

对话会对照您的意图进行评估，而不仅仅是关键词匹配。Snoopy 理解上下文——它知道有人在*抱怨*您的产品，与有人*想要购买*您的产品之间的区别。

配置一次您的评估提示词。Snoopy 会将其应用于发现的每一条帖子和评论。

---

## 反馈驱动的提示词进化

Snoopy 支持完整反馈闭环，让评估质量随时间持续提升：

1. 审阅最近未验证的合格结果
2. 按结果提交有效/无效反馈
3. 合并反馈，生成更优的评估提示词

```bash
snoopy feedback review --json
snoopy feedback submit <resultId> --invalid --reason "并非真实购买意图"
snoopy feedback consolidate
```

在交互式审阅中，如果用户提前退出，Snoopy 会提示是否先运行 consolidate，避免遗漏提示词更新。

---

## 持续守护进程监控

配置完成后，Snoopy 在后台按 cron 计划进行扫描。设置您的频次，让它持续运行。需要快速验证时触发手动扫描。

```bash
snoopy daemon start        # 启动后台守护进程
snoopy job run --limit 5   # 快速手动扫描
snoopy job runs <ref>      # 查看运行历史
```

---

## 代码驱动的高效率

Snoopy 用确定性代码处理数据抓取、调度、状态管理和结果持久化。您的 token 用于评估智能——理解对话是否匹配您的意图——而非基础设施开销。

不会在分页逻辑上消耗上下文窗口。不会在序列化和存储上浪费 token。只在关键评估上精准投入。

---

## 本地化与隐私保护

结果存储在本地 SQLite 数据库中。无云依赖。您的监控数据和搜索标准保存在您自己的机器上。

```bash
snoopy export --json --last-run   # 结构化导出
snoopy consume --json             # 标记结果已消费
```

支持智能体和集成的直接 SQLite 访问。完整模式文档请参阅[数据库模式](./reference/database-schema.md)参考。

---

## 成本感知分析

跟踪每次运行中发现的、新增的和符合条件的项目。Token 使用量和成本估算内置于每个分析视图中。

```bash
snoopy analytics --days 7
snoopy analytics <jobRef> --days 30
```

清楚地了解每个监控任务随时间推移的运行成本。

---

## 智能体与 CI 就绪

- **MCP 服务器** — `snoopy mcp` 通过 stdio 为 Claude Code、ChatGPT、Gemini 或任何 MCP 主机暴露工具
- **直接 SQLite 访问** — 智能体可以直接对 `~/.snoopy/snoopy.db` 插入任务、查询结果和更新生命周期标志
- **非交互模式** — 直接传递任务引用，实现零提示执行
- **机器可读输出** — `--json` 标志适用于 export、consume 和 analytics
- **环境变量配置** — `TELEPAT_OPENROUTER_KEY`、`SNOOPY_REDDIT_CLIENT_SECRET`、`SNOOPY_ROOT_DIR`

---

## 跨平台，持续在线

支持 macOS、Linux 和 Windows。注册开机自启，确保监控永不停歇。

```bash
snoopy startup install
snoopy startup status
snoopy doctor               # 健康检查
```

---

## 准备好发现您的对话了吗？

[开始使用 →](./getting-started/installation.md)

或者直接跳转到[快速开始](./getting-started/quickstart.md)和 [CLI 参考](./reference/cli-reference.md)。
