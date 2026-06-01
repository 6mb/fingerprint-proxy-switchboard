# Release Notes

## zh-CN

建议标题：

`v0.2.0 - 新版管理台与可配置槽位`

建议说明：

- 新增 React 管理台界面，整体风格升级为更现代的控制台布局
- 概述页重构，优先展示端口槽位状态，并将节点池与订阅源摘要分组展示
- 端口槽位卡片支持单槽位测速与出口检测
- 出口信息增加纯净度与风险分展示
- 支持在后台直接维护槽位数量与端口列表，运行配置写入 `config/panel.yaml`
- 订阅源管理支持本地文件、订阅链接与 URL 文件三种方式
- 仓库补充中英文文档、部署说明、截图与 MIT 许可证

建议附图：

- [概述页](./screenshots/overview.png)
- [端口槽位](./screenshots/slots.png)
- [订阅源](./screenshots/sources.png)
- [系统配置](./screenshots/settings.png)

## English

Suggested title:

`v0.2.0 - New dashboard and configurable proxy slots`

Suggested notes:

- Introduced a React-based admin dashboard with a cleaner control-panel layout
- Reworked the overview page to prioritize slot status and group node/source summaries
- Added per-slot delay testing and egress probing from the dashboard
- Added egress purity and fraud score indicators
- Added admin-side slot count and slot port management persisted to `config/panel.yaml`
- Added source management for local files, subscription URLs, and URL files
- Expanded repository docs with bilingual READMEs, deployment notes, screenshots, and an MIT license

Suggested screenshots:

- [Overview](./screenshots/overview.png)
- [Slots](./screenshots/slots.png)
- [Sources](./screenshots/sources.png)
- [Settings](./screenshots/settings.png)
