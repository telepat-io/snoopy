---
title: 开发
---

# 贡献：开发

欢迎贡献代码。在本地开发和通过质量门禁时，请参考本指南。

## 本地环境搭建

```bash
npm ci
npm run build
npm test
```

## 必需的验证顺序

在创建 PR 之前，请按以下顺序执行检查：

```bash
npm run lint
npm run build
npm test
```

如果文档/站点文件有改动，还需运行：

```bash
npm run docs:build
```

## 测试预期

- 对于有实质意义的行为变更，请新增或更新测试。
- 保持变更范围明确且聚焦。
- 保持启动/守护进程命令的跨平台兼容性。

## 参考资源

- [E2E 冒烟测试](../technical/e2e-testing.md)
- [安全性](../technical/security.md)
- [CLI 参考](../reference/cli-reference.md)
