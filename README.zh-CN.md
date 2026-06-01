# Fingerprint Proxy Switchboard

一个面向指纹浏览器代理场景的轻量切换面板。它通过独立的 Mihomo 实例暴露多个固定端口，每个端口都对应一个独立槽位，可以单独切换节点、测速、重载配置，并在 Web 后台里统一管理订阅源。

## 功能特性

- 槽位数量与端口自定义：可通过 `SLOT_PORTS` 初始化，也可在后台直接调整开放数量与端口列表
- `mixed` 端口：同一个端口同时支持 HTTP 与 SOCKS5
- 独立 Mihomo Core：不污染现有系统里的 Mihomo 部署
- 订阅源管理：支持本地文件、远程 URL、URL 文件三种方式
- 后台管理台：React 仪表盘风格界面，适合长期维护
- 一键测速与重载：支持单节点测速、全量测速、生成并重载配置

## 界面截图

### 概述

![概述页](./docs/screenshots/overview.png)

### 端口槽位

![端口槽位页](./docs/screenshots/slots.png)

### 订阅源

![订阅源页](./docs/screenshots/sources.png)

### 系统配置

![系统配置页](./docs/screenshots/settings.png)

## 适用场景

- 指纹浏览器、多开浏览器、自动化浏览器需要固定代理端口
- 希望把多个订阅源合并进一个可切换的端口池
- 需要给非命令行使用者一个清晰的 Web 管理界面

## 技术栈

### 后端

- Python 3.9
- FastAPI
- httpx
- PyYAML

### 前端

- React 19
- TypeScript
- Vite 8
- Tailwind CSS v4
- TanStack Query
- Lucide React

### 运行方式

- Docker Compose
- 独立 Mihomo 容器
- `host` 网络模式暴露控制面与代理端口

## 项目结构

```text
.
├── app/
│   ├── main.py               # FastAPI 入口、API 路由、SPA 回退
│   ├── config_builder.py     # 订阅与配置生成逻辑
│   ├── mihomo_client.py      # Mihomo external-controller 客户端
│   ├── render_config_cli.py  # 启动前生成 config.yaml
│   └── settings.py           # 环境变量与运行配置
├── config/
│   ├── source.example.yaml   # 单源示例
│   ├── sources.example.yaml  # 多源清单示例
│   ├── subscription-cache/   # 运行时订阅缓存
│   └── subscriptions/        # 运行时 .url 文件
├── web-ui/
│   ├── src/
│   └── package.json
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## 部署要求

- Docker Engine
- Docker Compose
- 可访问订阅源的网络环境
- 一台可开放固定端口的 Linux 主机

## 快速部署

### 1. 准备环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少确认这些变量：

- `PANEL_TOKEN`：后台登录 Token
- `PROXY_AUTH`：浏览器代理认证，格式 `username:password`
- `PUBLIC_HOST`：面板对外显示的主机名或 IP
- `MIHOMO_SECRET`：Mihomo external-controller 密钥

### 2. 准备配置文件

单源模式：

```bash
cp config/source.example.yaml config/source.yaml
```

多源模式：

```bash
cp config/sources.example.yaml config/sources.yaml
```

两种模式二选一即可，不需要同时使用。

如果使用 `sources.yaml` 管理多个来源，推荐把真实订阅链接写入 `config/subscriptions/*.url`，再在 `sources.yaml` 里通过 `url_file` 引用。

### 3. 启动服务

```bash
docker compose up -d --build
```

### 4. 打开面板

```text
http://<your-host>:6310
```

默认代理端口示例：

```text
HTTP   http://<your-host>:6181
SOCKS5 socks5://<your-host>:6181
```

其余槽位依次类推。实际开放多少个槽位，取决于 `SLOT_PORTS` 里配置了多少个端口。
部署完成后，也可以在后台的 `系统配置` 页面直接修改，运行时配置会写入 `config/panel.yaml`。

例如：

```env
SLOT_PORTS=6181,6182,7001,7002,7003
```

上面的配置会开放 5 个槽位，端口分别是 `6181`、`6182`、`7001`、`7002`、`7003`。

## 环境变量说明

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PANEL_HOST` | `0.0.0.0` | 面板监听地址 |
| `PANEL_PORT` | `6310` | 面板端口 |
| `PANEL_TOKEN` | `change-me` | 面板登录 Token |
| `PUBLIC_HOST` | `127.0.0.1` 或自定义 | 面板展示给用户的出口主机 |
| `PROXY_AUTH` | 空 | 代理认证，格式 `user:pass` |
| `MIHOMO_API` | `http://127.0.0.1:6311` | Mihomo API 地址 |
| `MIHOMO_SECRET` | 空 | Mihomo external-controller 密钥 |
| `MIHOMO_CONTROLLER` | `127.0.0.1:6311` | Mihomo controller 地址 |
| `MIHOMO_CONFIG_PATH` | `/root/.config/mihomo/config.yaml` | Mihomo 配置文件路径 |
| `SLOT_PORTS` | `6181,6182,6183,6184,6185,6186` | 槽位端口列表，端口数量就是槽位数量 |
| `SOURCE_PATH` | `/app/config/source.yaml` | 单源文件路径 |
| `SOURCES_PATH` | `/app/config/sources.yaml` | 多源清单路径 |
| `OUTPUT_PATH` | `/app/config/config.yaml` | 生成后的 Mihomo 配置输出路径 |
| `DELAY_TEST_URL` | `https://www.gstatic.com/generate_204` | 测速探测 URL |
| `SUBSCRIPTION_URL_FILE` | 空 | 兼容旧模式的单 URL 文件 |

## 订阅源配置

### 单源示例

```yaml
proxies:
  - name: Example-SS
    type: ss
    server: example.invalid
    port: 443
    cipher: aes-128-gcm
    password: change-me
```

### 多源示例

```yaml
sources:
  - name: local-provider
    path: /app/config/source.yaml
  - name: remote-provider
    url: https://example.invalid/subscription.yaml
  - name: remote-provider-secret
    url_file: /app/config/subscriptions/provider.url
```

## 本地开发

### 后端

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 6310
```

### 前端

```bash
cd web-ui
cp .env.example .env
npm install
npm run dev
```

如果前端和后端不在同一台机器上运行，请修改：

```bash
VITE_API_PROXY_TARGET=http://<your-host>:6310
```

## 安全说明

- 不要提交真实的 `.env`
- 不要提交真实订阅链接、`.url` 文件、生成后的 `config.yaml`
- `config/subscription-cache/` 中的内容是运行时缓存，不应纳入版本控制
- 仓库当前附带 `MIT` 许可证，如与你的发布目标不一致，请自行调整

## 发布到 GitHub 前建议

1. 再次确认 `.env` 和 `config/` 下的真实数据没有进入仓库
2. 填写仓库描述、主题标签、截图
3. 如果准备接受外部贡献，可以继续细化 `CONTRIBUTING.md`

## 发布说明

- 可直接参考 [docs/release-notes.md](./docs/release-notes.md) 作为 GitHub Release 文案模板
