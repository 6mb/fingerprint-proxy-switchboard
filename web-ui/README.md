# FP Switchboard Web UI

RuleFlow 风格的后台前端，负责为 `fingerprint-proxy-switchboard` 提供统一管理台。

前端会根据后端返回的 `slots` 数据自动渲染槽位数量，因此槽位个数与端口列表完全由后端环境变量 `SLOT_PORTS` 决定。

## 技术栈

- React 19
- TypeScript
- Vite 8
- Tailwind CSS v4
- TanStack Query
- Lucide React

## 页面结构

- `/login`：登录页
- `/dashboard`：概览页，展示内核、节点池、认证状态、订阅源异常
- `/slots`：端口槽位页，负责切换节点与单槽位测速
- `/nodes`：节点池页，支持国家筛选、分页与逐个测速
- `/sources`：订阅源页，支持保存与保存后重载

## 目录职责

```text
src/
├── components/
│   ├── dashboard/   # 概览页业务组件
│   ├── layout/      # 后台框架、导航、顶部工具栏
│   ├── nodes/       # 节点池表格
│   ├── slots/       # 槽位卡片
│   ├── sources/     # 订阅源编辑器
│   └── ui/          # 基础按钮、卡片、徽标、输入框
├── hooks/           # Session / status / sources 查询与变更
├── lib/             # API 访问、格式化工具、样式工具
├── pages/           # 路由页面
└── types/           # API 类型定义
```

## 本地开发

```bash
cp .env.example .env
npm install
npm run dev
```

如果前端开发机与面板不在同一台机器，请修改 `VITE_API_PROXY_TARGET`。
