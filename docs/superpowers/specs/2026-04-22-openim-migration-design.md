# 设计文档：OpenIM 替代野火 IM

## 概述

将客服系统的 IM 基础设施从野火 IM 迁移到 OpenIM。采用抽象接口层 + OpenIM 实现的方式，一步替换，数据库重新设计，历史数据不迁移。

### 迁移驱动力

- Web SDK 开源：野火 Web SDK 核心协议层闭源需购买，OpenIM 完全开源
- 去除商业风险：OpenIM Apache 2.0 无商业限制
- 更强 Webhook 能力：OpenIM 支持 40+ 事件、消息拦截/修改

### 决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 迁移方式 | 抽象接口层 + OpenIM 实现 | 解耦 IM 依赖，未来可替换 |
| 数据库 | 重新设计 | 去掉野火特有字段，干净起步 |
| 历史数据 | 不迁移 | 开发阶段，从零开始 |
| 部署资源 | 全套部署 | 服务器资源充足（8GB+） |

---

## 1. IM 抽象接口层

### 1.1 IMProvider 接口

文件：`src/lib/im/types.ts`

```typescript
/** IM 提供者接口 */
export interface IMProvider {
  /** 创建 Bot 账号 */
  createBot(params: CreateBotParams): Promise<BotAccount>

  /** 发送消息（Bot -> 用户） */
  sendMessage(params: SendMessageParams): Promise<void>

  /** 解析 webhook 载荷为统一格式 */
  parseWebhook(rawBody: unknown): IncomingMessage

  /** 获取用户信息 */
  getUserInfo(userId: string): Promise<IMUser>

  /** 批量获取用户信息 */
  getUserInfoBatch(userIds: string[]): Promise<IMUser[]>

  /** 设置 Bot 的 webhook 回调 URL（可选，部分 IM 不支持 per-bot URL） */
  setBotCallback?(botId: string, url: string): Promise<void>
}
```

### 1.2 统一类型定义

```typescript
/** 统一消息类型枚举 */
export enum MessageContentType {
  Text = 1,
  Image = 2,
  Voice = 3,
  Video = 4,
  File = 5,
  Location = 6,
  Custom = 100,
}

/** 统一入站消息格式 */
export interface IncomingMessage {
  messageId: string
  senderId: string
  senderName?: string
  recipientId: string       // Bot ID
  contentType: number        // MessageContentType 枚举值
  content: string
  timestamp: number
}

export interface CreateBotParams {
  userId: string
  nickname: string
  avatarUrl?: string
}

export interface BotAccount {
  userId: string
  nickname: string
}

export interface SendMessageParams {
  fromBotId: string
  toUserId: string
  contentType: MessageContentType
  content: string
}

export interface IMUser {
  userId: string
  displayName: string
  avatarUrl?: string
}
```

### 1.3 Provider 导出

文件：`src/lib/im/index.ts`

导出单例 provider 实例，根据环境变量构建 `OpenIMProvider`。所有上层代码 `import { imProvider } from '@/lib/im'` 即可使用。

---

## 2. OpenIM Provider 实现

文件：`src/lib/im/openim-provider.ts`

### 2.1 认证

- OpenIM 使用 JWT token 认证（非野火的 SHA1 签名）
- Provider 内部通过 `POST /auth/get_admin_token` 获取 admin token
- Token 带过期时间，Provider 内部缓存并自动刷新

### 2.2 API 映射

| IMProvider 方法 | OpenIM API |
|----------------|------------|
| `createBot()` | `POST /user/add_notification_account` |
| `sendMessage()` | `POST /msg/send_msg`（admin token） |
| `getUserInfo()` | `POST /user/get_users_info` |
| `getUserInfoBatch()` | `POST /user/get_users_info`（批量） |
| `parseWebhook()` | 解析 `afterSendSingleMsg` 载荷 |
| `setBotCallback` | 不实现（OpenIM 全局配置） |

### 2.3 消息类型映射

| MessageContentType | OpenIM contentType |
|---|---|
| Text = 1 | 101 |
| Image = 2 | 102 |
| Voice = 3 | 103 |
| Video = 4 | 104 |
| File = 5 | 105 |
| Location = 6 | 109 |
| Custom = 100 | 110 |

---

## 3. 数据库 Schema 变更

### 3.1 Bot 模型（原 Robot）

```prisma
model Bot {
  id          String    @id @default(cuid())
  imUserId    String    @unique   // OpenIM notification account ID
  name        String    @unique
  displayName String
  avatarUrl   String?
  createdById String
  createdBy   User      @relation("CreatedBots", fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
  sessions    Session[]
}
```

**与原 Robot 模型对比**：
- 删除 `secret`：OpenIM 统一用 admin token，不需要 per-bot secret
- 删除 `callbackUrl`：OpenIM webhook 全局配置
- 重命名 Robot → Bot：与 OpenIM BotPlatformID 概念对齐
- 新增 `avatarUrl`：OpenIM 创建通知账号时支持 faceURL

### 3.2 Session 模型

- `robotId` → `botId`
- 关联从 `Robot` → `Bot`
- 其余字段不变

### 3.3 Message 模型

- 结构不变
- `contentType` 存储统一枚举值（非 OpenIM 原生值）
- `imMessageId` 含义变为 OpenIM 消息 ID

### 3.4 User 模型

- `createdRobots` 关联 → `createdBots`
- 其余不变

---

## 4. Webhook 路由

### 4.1 新端点

`POST /api/webhook/openim`（替代 `/api/webhook/robot`）

### 4.2 处理流程

```
OpenIM afterSendSingleMsg 事件
  |
  v
POST /api/webhook/openim
  |
  v
校验 callbackCommand === "callbackAfterSendSingleMsgCommand"
（当前只处理此事件，其他 OpenIM 事件如 beforeSendSingleMsg 按需后续增加）
  |
  v
imProvider.parseWebhook(body) -> IncomingMessage
  |
  v
通过 recipientId 查找 Bot
  |
  v
查找或创建 Session（customerId = senderId）
  |
  v
保存 Message 到数据库
  |
  v
EventBus 广播 -> SSE -> 前端更新
```

### 4.3 OpenIM Webhook 配置

文件：`deploy/openim/webhooks.yml`

```yaml
url: http://host.docker.internal:3000/api/webhook/openim

afterSendSingleMsg:
  enable: true
  timeout: 5
```

---

## 5. 环境变量

### 删除

```env
WILDFIRE_IM_URL
WILDFIRE_ADMIN_URL
WILDFIRE_ADMIN_SECRET
```

### 新增

```env
OPENIM_API_URL="http://localhost:10002"
OPENIM_ADMIN_SECRET="openIM123"
OPENIM_ADMIN_USERID="imAdmin"
WEBHOOK_CALLBACK_BASE="http://host.docker.internal:3000"
```

---

## 6. Docker Compose 部署

替换为 OpenIM 全套服务栈：

| 服务 | 用途 |
|------|------|
| MongoDB | 消息和用户存储 |
| Redis | 缓存、在线状态 |
| Kafka | 消息队列 |
| etcd | 服务发现 |
| MinIO | 对象存储 |
| OpenIM Server | IM 核心服务（端口 10001/10002） |

预计资源占用：2-4GB 内存。

---

## 7. 文件变更清单

### 新建

| 文件 | 说明 |
|------|------|
| `src/lib/im/types.ts` | IMProvider 接口 + 统一类型 |
| `src/lib/im/openim-provider.ts` | OpenIM 实现 |
| `src/lib/im/index.ts` | 导出 provider 单例 |
| `src/app/api/webhook/openim/route.ts` | OpenIM webhook 端点 |
| `src/app/api/admin/bots/route.ts` | Bot 管理（原 robots） |
| `src/app/api/admin/bots/greet/route.ts` | Bot 打招呼（原 robots/greet） |
| `deploy/openim/webhooks.yml` | OpenIM webhook 配置 |

### 删除

| 文件 | 说明 |
|------|------|
| `src/lib/wildfire.ts` | 野火 API 封装 |
| `src/app/api/webhook/robot/route.ts` | 野火 webhook 端点 |
| `src/app/api/admin/robots/route.ts` | 野火 robot 管理 |
| `src/app/api/admin/robots/greet/route.ts` | 野火 robot 打招呼 |

### 改造

| 文件 | 变更 |
|------|------|
| `prisma/schema.prisma` | Robot→Bot, 删 secret/callbackUrl |
| `src/app/api/admin/im-users/route.ts` | 调用 imProvider |
| `src/app/api/sessions/[id]/messages/route.ts` | 用 provider 发消息 |
| `src/app/api/sessions/route.ts` | robotId→botId |
| `src/components/robot-form.tsx` | 字段适配，去掉 secret |
| `src/app/dashboard/admin/robots/page.tsx` | 路由→/admin/bots |
| `src/app/dashboard/workbench/page.tsx` | API 路径适配 |
| `.env.example` | 新环境变量 |
| `deploy/docker-compose.yml` | OpenIM 服务栈 |

### 不变

| 文件 | 理由 |
|------|------|
| `src/components/chat-panel.tsx` | 只依赖内部 API |
| `src/components/session-list.tsx` | 只依赖内部 API |
| `src/hooks/use-sse.ts` | 完全独立 |
| `src/lib/event-bus.ts` | 完全独立 |
| `src/lib/auth.ts` | 完全独立 |
| `src/middleware.ts` | 完全独立 |
