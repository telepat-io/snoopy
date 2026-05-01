---
title: 发布与文档部署
---

# 发布与文档部署

Snoopy 使用 release-please 自动化和 npm 发布工作流。

## 发布自动化

- `release-please.yml` 负责管理 `main` 分支上的版本号和变更日志。
- 当发布被创建时，发布流程会运行并通过质量门禁和 npm 溯源验证。

## 手动发布工作流

- `npm-publish.yml` 可用于手动的 `workflow_dispatch` 发布。
- 在发布前，它会验证标签格式、包元数据以及主分支的祖先关系。

## 文档部署

文档通过 `docs-pages.yml` 部署到 GitHub Pages。

本地文档检查：

```bash
npm run docs:build
```

## 参考

- [快速入门](../getting-started/overview.md)
- [CLI 参考](../reference/cli-reference.md)
