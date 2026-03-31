# 野火客服工作台

基于 [野火 IM](https://github.com/wildfirechat) 的客服系统。用户在野火 App 给客服机器人发消息，客服人员在工作台实时接入回复。

## 架构

```
用户 App (野火 IM)
    │ 发消息给客服机器人
    ▼
┌──────────────────────────┐
│  im-server (Docker)      │──── webhook 回调 ────→ 客服工作台 (Next.js)
│  app-server (Docker)     │←─── Robot API 回复 ──── :3000
│  :80 :1883 :18080 :8888  │
└──────────────────────────┘
```

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js (App Router) + Tailwind CSS |
| 后端 | Next.js API Routes + Prisma |
| 数据库 | PostgreSQL |
| 实时推送 | Server-Sent Events (SSE) |
| IM 基础设施 | 野火 IM Server + App Server (Docker) |
| 认证 | JWT (httpOnly Cookie) |

## 功能

- **客服工作台** — 实时会话列表 + 聊天面板 + SSE 消息推送
- **会话管理** — 排队、接入、回复、结束
- **机器人管理** — 创建客服机器人、发送欢迎语触达用户
- **客服管理** — 创建客服账号，admin/agent 角色权限
- **测试页面** — 左右分屏，左侧模拟客户、右侧客服工作台

## 快速开始

### 1. 启动 IM Server

```bash
cd deploy
docker compose up -d
```

首次启动需配置 `server.ip`（改为你的局域网 IP）：

```bash
docker exec wfc-im-server sed -i 's/server.ip 0.0.0.0/server.ip 你的IP/' /opt/im-server/config/wildfirechat.conf
docker exec wfc-im-server sed -i 's/robot.callback_with_sender_info false/robot.callback_with_sender_info true/' /opt/im-server/config/wildfirechat.conf
docker restart wfc-im-server

docker exec wfc-app-server sed -i 's|http://localhost:18080|http://im-server:18080|' /opt/app-server/config/im.properties
docker restart wfc-app-server
```

### 2. 启动客服工作台

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，确认数据库连接和 IM Server 地址

# 初始化数据库
npx prisma migrate dev

# 创建默认管理员 (admin / admin123)
npm run db:seed

# 启动
npm run dev
```

打开 http://localhost:3000 登录。

### 3. 创建机器人 & 测试

1. 机器人管理 → 创建机器人（Webhook 自动配置）
2. 机器人管理 → 发送欢迎语 → 选择用户 → 用户 App 出现机器人
3. 用户给机器人发消息 → 工作台实时收到 → 客服接入回复

不需要 App 也可以测试：侧边栏扳手图标 → 测试页面。

## 项目结构

```
wildfire-cs/
├── deploy/
│   └── docker-compose.yml          # IM Server + App Server
├── prisma/
│   ├── schema.prisma               # 数据库模型
│   └── seed.ts                     # 种子数据
├── src/
│   ├── app/
│   │   ├── login/                  # 登录页
│   │   ├── dashboard/
│   │   │   ├── workbench/          # 客服工作台
│   │   │   ├── demo/               # 测试页面
│   │   │   └── admin/
│   │   │       ├── robots/         # 机器人管理
│   │   │       └── agents/         # 客服管理
│   │   └── api/
│   │       ├── auth/               # 登录/登出/用户信息
│   │       ├── webhook/robot/      # IM Server 回调入口
│   │       ├── sessions/           # 会话 CRUD
│   │       ├── sse/                # 实时事件推送
│   │       └── admin/              # 管理 API
│   ├── lib/
│   │   ├── prisma.ts               # 数据库客户端
│   │   ├── auth.ts                 # JWT 认证
│   │   ├── wildfire.ts             # 野火 IM API 封装
│   │   └── event-bus.ts            # SSE 事件总线
│   ├── components/                 # UI 组件
│   └── hooks/
│       └── use-sse.ts              # SSE 客户端 Hook
├── docs/
│   └── 操作手册.md                  # 详细部署和操作指南
└── .env.example                    # 环境变量模板
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接 | `postgresql://postgres:123456@localhost:5432/wildfire-cs` |
| `JWT_SECRET` | JWT 签名密钥 | `wildfire-cs-jwt-secret-change-in-production` |
| `WILDFIRE_IM_URL` | IM Server 地址 | `http://localhost:80` |
| `WILDFIRE_ADMIN_URL` | Admin API 地址 | `http://localhost:18080` |
| `WILDFIRE_ADMIN_SECRET` | Admin API 密钥 | `123456` |
| `WEBHOOK_CALLBACK_BASE` | Webhook 回调基地址 | `http://host.docker.internal:3000` |

## 端口

| 端口 | 服务 | 说明 |
|------|------|------|
| 80 | im-server | 客户端 HTTP + Robot API |
| 1883 | im-server | MQTT 长连接 |
| 8888 | app-server | App 登录注册 |
| 18080 | im-server | Admin API |
| 3000 | 客服工作台 | Web UI |
| 5432 | PostgreSQL | 数据库 |

## 详细文档

完整的部署流程、配置说明、消息流转、常见问题排查见 [操作手册](docs/操作手册.md)。

## License

[Apache License 2.0](LICENSE)
