# OpenIM Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace WildFire IM with OpenIM as the customer service system's IM infrastructure, using an abstract IMProvider interface.

**Architecture:** Abstract `IMProvider` interface in `src/lib/im/types.ts`, concrete `OpenIMProvider` in `src/lib/im/openim-provider.ts`, exported as singleton from `src/lib/im/index.ts`. All routes and components updated to use the provider and new `Bot` model (renamed from `Robot`).

**Tech Stack:** Next.js 16, Prisma 7, PostgreSQL, OpenIM Server (Go), Docker Compose

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/lib/im/types.ts` | IMProvider interface + unified types |
| Create | `src/lib/im/openim-provider.ts` | OpenIM implementation |
| Create | `src/lib/im/index.ts` | Export singleton provider |
| Create | `src/app/api/webhook/openim/route.ts` | OpenIM webhook endpoint |
| Create | `src/app/api/admin/bots/route.ts` | Bot CRUD (replaces robots) |
| Create | `src/app/api/admin/bots/greet/route.ts` | Bot greeting (replaces robots/greet) |
| Create | `src/components/bot-form.tsx` | Bot creation form (replaces robot-form) |
| Create | `src/app/dashboard/admin/bots/page.tsx` | Bot management page (replaces robots page) |
| Create | `deploy/openim/webhooks.yml` | OpenIM webhook config |
| Modify | `prisma/schema.prisma` | Robot->Bot, remove secret/callbackUrl |
| Modify | `src/app/api/admin/im-users/route.ts` | Use imProvider |
| Modify | `src/app/api/sessions/[id]/messages/route.ts` | Use imProvider |
| Modify | `src/app/api/sessions/route.ts` | robot->bot references |
| Modify | `src/app/api/sessions/[id]/route.ts` | robot->bot references |
| Modify | `src/app/dashboard/workbench/page.tsx` | robot->bot in types |
| Modify | `src/components/session-list.tsx` | robot->bot in props |
| Modify | `src/components/sidebar.tsx` | Nav link robots->bots |
| Modify | `.env.example` | New env vars |
| Rewrite | `deploy/docker-compose.yml` | OpenIM service stack |
| Delete | `src/lib/wildfire.ts` | Old wildfire wrapper |
| Delete | `src/app/api/webhook/robot/route.ts` | Old webhook |
| Delete | `src/app/api/admin/robots/route.ts` | Old robot CRUD |
| Delete | `src/app/api/admin/robots/greet/route.ts` | Old robot greet |
| Delete | `src/components/robot-form.tsx` | Old robot form |
| Delete | `src/app/dashboard/admin/robots/page.tsx` | Old robots page |

---

### Task 1: IM Provider Interface & Types

**Files:**
- Create: `src/lib/im/types.ts`

- [ ] **Step 1: Create the IMProvider interface and unified types**

```typescript
// src/lib/im/types.ts

/** Unified message content types (IM-agnostic) */
export enum MessageContentType {
  Text = 1,
  Image = 2,
  Voice = 3,
  Video = 4,
  File = 5,
  Location = 6,
  Custom = 100,
}

export interface CreateBotParams {
  userId: string;
  nickname: string;
  avatarUrl?: string;
}

export interface BotAccount {
  userId: string;
  nickname: string;
}

export interface SendMessageParams {
  fromBotId: string;
  toUserId: string;
  contentType: MessageContentType;
  content: string;
}

export interface IMUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

/** Unified inbound message from webhook */
export interface IncomingMessage {
  messageId: string;
  senderId: string;
  senderName?: string;
  recipientId: string;
  contentType: number;
  content: string;
  timestamp: number;
}

/** IM Provider interface — all IM interactions go through this */
export interface IMProvider {
  createBot(params: CreateBotParams): Promise<BotAccount>;
  sendMessage(params: SendMessageParams): Promise<void>;
  parseWebhook(rawBody: unknown): IncomingMessage;
  getUserInfo(userId: string): Promise<IMUser>;
  getUserInfoBatch(userIds: string[]): Promise<IMUser[]>;
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit src/lib/im/types.ts 2>&1 || echo 'check errors above'`
Expected: No errors (standalone types, no imports needed)

- [ ] **Step 3: Commit**

```bash
git add src/lib/im/types.ts
git commit -m "feat: add IMProvider interface and unified IM types"
```

---

### Task 2: OpenIM Provider Implementation

**Files:**
- Create: `src/lib/im/openim-provider.ts`
- Create: `src/lib/im/index.ts`

- [ ] **Step 1: Create the OpenIM provider**

```typescript
// src/lib/im/openim-provider.ts

import {
  IMProvider,
  CreateBotParams,
  BotAccount,
  SendMessageParams,
  IncomingMessage,
  IMUser,
  MessageContentType,
} from "./types";

/** Map unified MessageContentType to OpenIM contentType */
const TO_OPENIM_CONTENT_TYPE: Record<number, number> = {
  [MessageContentType.Text]: 101,
  [MessageContentType.Image]: 102,
  [MessageContentType.Voice]: 103,
  [MessageContentType.Video]: 104,
  [MessageContentType.File]: 105,
  [MessageContentType.Location]: 109,
  [MessageContentType.Custom]: 110,
};

/** Map OpenIM contentType to unified MessageContentType */
const FROM_OPENIM_CONTENT_TYPE: Record<number, number> = {
  101: MessageContentType.Text,
  102: MessageContentType.Image,
  103: MessageContentType.Voice,
  104: MessageContentType.Video,
  105: MessageContentType.File,
  109: MessageContentType.Location,
  110: MessageContentType.Custom,
};

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class OpenIMProvider implements IMProvider {
  private apiUrl: string;
  private adminSecret: string;
  private adminUserId: string;
  private tokenCache: TokenCache | null = null;

  constructor(apiUrl: string, adminSecret: string, adminUserId: string) {
    this.apiUrl = apiUrl;
    this.adminSecret = adminSecret;
    this.adminUserId = adminUserId;
  }

  private async getAdminToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token;
    }

    const res = await fetch(`${this.apiUrl}/auth/get_admin_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: this.adminSecret,
        userID: this.adminUserId,
        platformID: 10,
      }),
    });

    const data = await res.json();
    if (data.errCode !== 0) {
      throw new Error(`OpenIM auth failed: ${data.errMsg}`);
    }

    const token = data.data.token as string;
    // Cache for 23 hours (token is valid for 24h)
    this.tokenCache = { token, expiresAt: Date.now() + 23 * 60 * 60 * 1000 };
    return token;
  }

  private async post(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const token = await this.getAdminToken();
    const res = await fetch(`${this.apiUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
        operationID: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  async createBot(params: CreateBotParams): Promise<BotAccount> {
    const data = await this.post("/user/add_notification_account", {
      userID: params.userId,
      nickName: params.nickname,
      faceURL: params.avatarUrl || "",
    });

    if ((data.errCode as number) !== 0) {
      throw new Error(`OpenIM createBot failed: ${data.errMsg}`);
    }

    return { userId: params.userId, nickname: params.nickname };
  }

  async sendMessage(params: SendMessageParams): Promise<void> {
    const openimContentType = TO_OPENIM_CONTENT_TYPE[params.contentType] ?? 101;

    const data = await this.post("/msg/send_msg", {
      sendID: params.fromBotId,
      recvID: params.toUserId,
      contentType: openimContentType,
      sessionType: 1, // single chat
      content: JSON.stringify({ content: params.content }),
    });

    if ((data.errCode as number) !== 0) {
      throw new Error(`OpenIM sendMessage failed: ${data.errMsg}`);
    }
  }

  parseWebhook(rawBody: unknown): IncomingMessage {
    const body = rawBody as Record<string, unknown>;

    const openimContentType = (body.contentType as number) ?? 101;
    const unifiedContentType = FROM_OPENIM_CONTENT_TYPE[openimContentType] ?? MessageContentType.Text;

    // OpenIM content is JSON-stringified for text messages
    let content = "";
    const rawContent = body.content as string;
    try {
      const parsed = JSON.parse(rawContent);
      content = parsed.content ?? rawContent;
    } catch {
      content = rawContent ?? "";
    }

    return {
      messageId: (body.serverMsgID as string) ?? (body.clientMsgID as string) ?? "",
      senderId: body.sendID as string,
      senderName: (body.senderNickname as string) ?? undefined,
      recipientId: body.recvID as string,
      contentType: unifiedContentType,
      content,
      timestamp: (body.sendTime as number) ?? Date.now(),
    };
  }

  async getUserInfo(userId: string): Promise<IMUser> {
    const users = await this.getUserInfoBatch([userId]);
    if (users.length === 0) {
      return { userId, displayName: userId };
    }
    return users[0];
  }

  async getUserInfoBatch(userIds: string[]): Promise<IMUser[]> {
    const data = await this.post("/user/get_users_info", { userIDs: userIds });

    if ((data.errCode as number) !== 0) {
      throw new Error(`OpenIM getUserInfoBatch failed: ${data.errMsg}`);
    }

    const users = (data.data as Array<Record<string, unknown>>) ?? [];
    return users.map((u) => ({
      userId: u.userID as string,
      displayName: (u.nickname as string) || (u.userID as string),
      avatarUrl: (u.faceURL as string) || undefined,
    }));
  }
}
```

- [ ] **Step 2: Create the provider singleton export**

```typescript
// src/lib/im/index.ts

import { OpenIMProvider } from "./openim-provider";
import type { IMProvider } from "./types";

export type { IMProvider } from "./types";
export {
  MessageContentType,
  type CreateBotParams,
  type BotAccount,
  type SendMessageParams,
  type IncomingMessage,
  type IMUser,
} from "./types";

const apiUrl = process.env.OPENIM_API_URL || "http://localhost:10002";
const adminSecret = process.env.OPENIM_ADMIN_SECRET || "openIM123";
const adminUserId = process.env.OPENIM_ADMIN_USERID || "imAdmin";

export const imProvider: IMProvider = new OpenIMProvider(apiUrl, adminSecret, adminUserId);
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `src/lib/im/`

- [ ] **Step 4: Commit**

```bash
git add src/lib/im/openim-provider.ts src/lib/im/index.ts
git commit -m "feat: add OpenIM provider implementation"
```

---

### Task 3: Database Schema Migration (Robot -> Bot)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Update the Prisma schema**

Replace the `Robot` model and update all references:

```prisma
// Replace the Robot model with:
model Bot {
  id          String   @id @default(cuid())
  imUserId    String   @unique @map("im_user_id")
  name        String   @unique
  displayName String   @map("display_name")
  avatarUrl   String?  @map("avatar_url")
  createdById String   @map("created_by_id")
  createdBy   User     @relation("CreatedBots", fields: [createdById], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")

  sessions Session[]

  @@map("bots")
}
```

Update User model relation:

```prisma
// In User model, replace:
  createdRobots Robot[]   @relation("CreatedBy")
// With:
  createdBots Bot[]   @relation("CreatedBots")
```

Update Session model:

```prisma
// In Session model, replace:
  robotId      String        @map("robot_id")
  robot        Robot         @relation(fields: [robotId], references: [id])
// With:
  botId        String        @map("bot_id")
  bot          Bot           @relation(fields: [botId], references: [id])
```

- [ ] **Step 2: Reset the database and regenerate client**

Run: `npx prisma db push --force-reset`
Expected: Database reset and schema applied.

Run: `npx prisma generate`
Expected: Prisma Client generated successfully.

- [ ] **Step 3: Verify the generated client has Bot model**

Run: `npx tsc --noEmit 2>&1 | grep -i "robot\|bot" | head -10`
Expected: Errors in files still referencing `prisma.robot` (we'll fix those next). No errors about the Bot model itself.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: rename Robot to Bot in schema, remove secret/callbackUrl"
```

---

### Task 4: Webhook Route (OpenIM)

**Files:**
- Create: `src/app/api/webhook/openim/route.ts`
- Delete: `src/app/api/webhook/robot/route.ts`

- [ ] **Step 1: Create the OpenIM webhook route**

```typescript
// src/app/api/webhook/openim/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";
import { imProvider } from "@/lib/im";

export async function POST(request: Request) {
  const body = await request.json();

  // Only handle afterSendSingleMsg events
  const command = body.callbackCommand as string | undefined;
  if (command !== "callbackAfterSendSingleMsgCommand") {
    return NextResponse.json({ actionCode: 0 });
  }

  // Only handle single chat (sessionType === 1)
  if (body.sessionType !== 1) {
    return NextResponse.json({ actionCode: 0 });
  }

  const msg = imProvider.parseWebhook(body);
  const botImUserId = msg.recipientId;
  const customerId = msg.senderId;

  // Get customer display name from webhook payload or fallback to IM API
  let customerName = msg.senderName || "";
  if (!customerName) {
    try {
      const info = await imProvider.getUserInfo(customerId);
      customerName = info.displayName;
    } catch {
      customerName = customerId;
    }
  }

  // Find the bot in our database
  const bot = await prisma.bot.findUnique({
    where: { imUserId: botImUserId },
  });

  if (!bot) {
    console.warn(`Webhook: unknown bot ${botImUserId}`);
    return NextResponse.json({ actionCode: 0 });
  }

  // Find or create an active session for this customer + bot
  let session = await prisma.session.findFirst({
    where: {
      customerId,
      botId: bot.id,
      status: { in: ["waiting", "active"] },
    },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        customerId,
        customerName,
        botId: bot.id,
        status: "waiting",
      },
    });

    eventBus.emit("cs-event", {
      type: "new-session",
      session: {
        id: session.id,
        customerId: session.customerId,
        customerName: session.customerName,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
      },
    });
  }

  // Save message
  const message = await prisma.message.create({
    data: {
      sessionId: session.id,
      senderType: "customer",
      senderId: customerId,
      contentType: msg.contentType,
      content: msg.content,
      imMessageId: msg.messageId,
    },
  });

  eventBus.emit("cs-event", {
    type: "new-message",
    targetAgentId: session.agentId || undefined,
    sessionId: session.id,
    message: {
      id: message.id,
      senderType: message.senderType,
      senderId: message.senderId,
      contentType: message.contentType,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  });

  return NextResponse.json({ actionCode: 0 });
}
```

- [ ] **Step 2: Delete the old webhook route**

```bash
rm src/app/api/webhook/robot/route.ts
rmdir src/app/api/webhook/robot 2>/dev/null || true
```

- [ ] **Step 3: Update middleware to allow the new webhook path**

Check `src/middleware.ts` — the current config allows `/api/webhook/*` which covers `/api/webhook/openim`. No change needed if the pattern is a wildcard. Verify:

Run: `grep -n "webhook" src/middleware.ts`
Expected: Pattern like `/api/webhook` in public routes list, covering the new path.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/webhook/openim/route.ts
git rm src/app/api/webhook/robot/route.ts
git commit -m "feat: replace wildfire webhook with OpenIM webhook route"
```

---

### Task 5: Bot Admin Routes (replaces Robot routes)

**Files:**
- Create: `src/app/api/admin/bots/route.ts`
- Create: `src/app/api/admin/bots/greet/route.ts`
- Delete: `src/app/api/admin/robots/route.ts`
- Delete: `src/app/api/admin/robots/greet/route.ts`

- [ ] **Step 1: Create Bot CRUD route**

```typescript
// src/app/api/admin/bots/route.ts

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { imProvider } from "@/lib/im";

export async function GET() {
  const bots = await prisma.bot.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { displayName: true } } },
  });
  return NextResponse.json({ bots });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, displayName, avatarUrl } = await request.json();

  if (!name || !displayName) {
    return NextResponse.json({ error: "名称和显示名不能为空" }, { status: 400 });
  }

  // Create notification account on OpenIM
  try {
    await imProvider.createBot({ userId: name, nickname: displayName, avatarUrl });
  } catch (err) {
    return NextResponse.json(
      { error: `OpenIM 创建 Bot 失败: ${err instanceof Error ? err.message : "未知错误"}` },
      { status: 502 }
    );
  }

  // Save to our database
  const bot = await prisma.bot.create({
    data: {
      imUserId: name,
      name,
      displayName,
      avatarUrl: avatarUrl || null,
      createdById: session.userId,
    },
  });

  return NextResponse.json({ bot }, { status: 201 });
}
```

- [ ] **Step 2: Create Bot greet route**

```typescript
// src/app/api/admin/bots/greet/route.ts

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { imProvider, MessageContentType } from "@/lib/im";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { botId, targetUserId, message } = await request.json();

  if (!botId || !targetUserId) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  const bot = await prisma.bot.findUnique({ where: { id: botId } });
  if (!bot) {
    return NextResponse.json({ error: "Bot 不存在" }, { status: 404 });
  }

  const greeting = message || `你好！我是${bot.displayName}，有什么可以帮您的吗？`;

  try {
    await imProvider.sendMessage({
      fromBotId: bot.imUserId,
      toUserId: targetUserId,
      contentType: MessageContentType.Text,
      content: greeting,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `发送失败: ${err instanceof Error ? err.message : "未知错误"}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Delete old robot routes**

```bash
rm src/app/api/admin/robots/route.ts
rm src/app/api/admin/robots/greet/route.ts
rmdir src/app/api/admin/robots/greet 2>/dev/null || true
rmdir src/app/api/admin/robots 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/bots/route.ts src/app/api/admin/bots/greet/route.ts
git rm src/app/api/admin/robots/route.ts src/app/api/admin/robots/greet/route.ts
git commit -m "feat: replace robot admin routes with bot admin routes"
```

---

### Task 6: Update IM Users Route

**Files:**
- Modify: `src/app/api/admin/im-users/route.ts`

- [ ] **Step 1: Replace wildfire imports with imProvider**

Replace the entire file content:

```typescript
// src/app/api/admin/im-users/route.ts

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { imProvider } from "@/lib/im";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const sessions = await prisma.session.findMany({
      select: { customerId: true, customerName: true },
      distinct: ["customerId"],
    });

    const realCustomerIds = sessions
      .map((s) => s.customerId)
      .filter((id) => !id.startsWith("demo_") && !id.startsWith("test_"));

    const userResults = await Promise.allSettled(
      realCustomerIds.map(async (userId) => {
        try {
          const info = await imProvider.getUserInfo(userId);
          return {
            userId: info.userId,
            displayName: info.displayName,
            name: info.userId,
          };
        } catch {
          const s = sessions.find((s) => s.customerId === userId);
          return { userId, displayName: s?.customerName || userId, name: "" };
        }
      })
    );

    const users = userResults
      .filter(
        (r): r is PromiseFulfilledResult<{ userId: string; displayName: string; name: string }> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ users: [] });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/admin/im-users/route.ts
git commit -m "refactor: update im-users route to use imProvider"
```

---

### Task 7: Update Session Messages Route

**Files:**
- Modify: `src/app/api/sessions/[id]/messages/route.ts`

- [ ] **Step 1: Replace wildfire import with imProvider**

Replace the entire file content:

```typescript
// src/app/api/sessions/[id]/messages/route.ts

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";
import { imProvider, MessageContentType } from "@/lib/im";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const messages = await prisma.message.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { content } = await request.json();

  if (!content) {
    return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
  }

  const csSession = await prisma.session.findUnique({
    where: { id },
    include: { bot: true },
  });

  if (!csSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (csSession.status !== "active") {
    return NextResponse.json({ error: "会话未激活" }, { status: 400 });
  }

  const message = await prisma.message.create({
    data: {
      sessionId: id,
      senderType: "agent",
      senderId: session.userId,
      contentType: 1,
      content,
    },
  });

  // Send via OpenIM
  try {
    await imProvider.sendMessage({
      fromBotId: csSession.bot.imUserId,
      toUserId: csSession.customerId,
      contentType: MessageContentType.Text,
      content,
    });
  } catch (err) {
    console.error("OpenIM send failed:", err);
  }

  eventBus.emit("cs-event", {
    type: "new-message",
    targetAgentId: session.userId,
    sessionId: id,
    message: {
      id: message.id,
      senderType: message.senderType,
      senderId: message.senderId,
      contentType: message.contentType,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/sessions/[id]/messages/route.ts
git commit -m "refactor: update session messages route to use imProvider"
```

---

### Task 8: Update Sessions List Route (robot -> bot)

**Files:**
- Modify: `src/app/api/sessions/route.ts`
- Modify: `src/app/api/sessions/[id]/route.ts` (if it includes robot)

- [ ] **Step 1: Update sessions list route**

In `src/app/api/sessions/route.ts`, change the `include` section:

Replace:
```typescript
      robot: { select: { displayName: true } },
```
With:
```typescript
      bot: { select: { displayName: true } },
```

- [ ] **Step 2: Update session detail/action route**

Read `src/app/api/sessions/[id]/route.ts` and replace any `robot` references with `bot`. The session PATCH route (assign/close/transfer) likely includes `robot` in its response. Update accordingly:

Replace all occurrences of `robot:` (in Prisma includes) with `bot:` and `robotId` with `botId` in this file.

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: Errors should be reduced to only frontend components (robot-form, robots page).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sessions/route.ts src/app/api/sessions/[id]/route.ts
git commit -m "refactor: update session routes robot->bot references"
```

---

### Task 9: Frontend — Bot Form & Bots Page

**Files:**
- Create: `src/components/bot-form.tsx`
- Create: `src/app/dashboard/admin/bots/page.tsx`
- Delete: `src/components/robot-form.tsx`
- Delete: `src/app/dashboard/admin/robots/page.tsx`

- [ ] **Step 1: Create BotForm component**

```typescript
// src/components/bot-form.tsx

"use client";

import { useState } from "react";

export function BotForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "创建失败");
        return;
      }

      setName("");
      setDisplayName("");
      onCreated();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
      <h3 className="mb-1 text-sm font-semibold text-[#334155]">创建 Bot</h3>
      <p className="mb-3 text-xs text-[#94A3B8]">Webhook 回调通过 OpenIM 全局配置</p>
      {error && <div className="mb-3 rounded-lg bg-[#FEE2E2] px-3 py-2 text-sm text-[#DC2626]">{error}</div>}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">名称</label>
          <input placeholder="英文标识，如 cs_bot" value={name} onChange={(e) => setName(e.target.value)} required className="block w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] outline-none placeholder:text-[#CBD5E1] focus:border-[#2563EB]" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">显示名称</label>
          <input placeholder="用户在 App 看到的名字" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="block w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm text-[#0F172A] outline-none placeholder:text-[#CBD5E1] focus:border-[#2563EB]" />
        </div>
        <button type="submit" disabled={loading} className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow shadow-[#2563EB]/15 disabled:opacity-50 cursor-pointer">
          {loading ? "创建中…" : "创建"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Create Bots management page**

```typescript
// src/app/dashboard/admin/bots/page.tsx

"use client";

import { useEffect, useState, useCallback } from "react";
import { BotForm } from "@/components/bot-form";

interface Bot {
  id: string;
  imUserId: string;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
  createdBy: { displayName: string };
}

interface IMUser {
  userId: string;
  displayName: string;
  name: string;
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [imUsers, setImUsers] = useState<IMUser[]>([]);
  const [greetBotId, setGreetBotId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [greetMsg, setGreetMsg] = useState("");
  const [greetLoading, setGreetLoading] = useState(false);
  const [greetResult, setGreetResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadBots = useCallback(async () => {
    const res = await fetch("/api/admin/bots");
    const data = await res.json();
    setBots(data.bots);
  }, []);

  const loadImUsers = useCallback(async () => {
    const res = await fetch("/api/admin/im-users");
    const data = await res.json();
    setImUsers(data.users || []);
  }, []);

  useEffect(() => { loadBots(); }, [loadBots]);

  useEffect(() => {
    if (greetBotId) loadImUsers();
  }, [greetBotId, loadImUsers]);

  async function handleGreet() {
    if (!greetBotId || !targetUserId) return;
    setGreetLoading(true);
    setGreetResult(null);

    const selectedUser = imUsers.find((u) => u.userId === targetUserId);
    const userName = selectedUser?.displayName || targetUserId;

    try {
      const res = await fetch("/api/admin/bots/greet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: greetBotId,
          targetUserId,
          message: greetMsg.trim() || undefined,
        }),
      });

      if (res.ok) {
        setGreetResult({ ok: true, msg: `已发送给「${userName}」，用户 App 中将出现此 Bot` });
        setTargetUserId("");
        setGreetMsg("");
      } else {
        const data = await res.json();
        setGreetResult({ ok: false, msg: data.error || "发送失败" });
      }
    } catch {
      setGreetResult({ ok: false, msg: "网络错误" });
    } finally {
      setGreetLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#0F172A]">Bot 管理</h1>
        <p className="mt-0.5 text-xs text-[#94A3B8]">创建客服 Bot，用户在 App 给 Bot 发消息即进入客服流程</p>
      </div>

      <BotForm onCreated={loadBots} />

      <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">显示名称</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">名称</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">IM User ID</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">操作</th>
            </tr>
          </thead>
          <tbody>
            {bots.map((b) => (
              <tr key={b.id} className="border-b border-[#F1F5F9] transition hover:bg-[#F8FAFC]">
                <td className="px-4 py-3 font-medium text-[#0F172A]">{b.displayName}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{b.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-[#94A3B8]">{b.imUserId}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setGreetBotId(greetBotId === b.id ? null : b.id); setGreetResult(null); }}
                    className="rounded-md bg-[#2563EB]/10 px-2.5 py-1 text-[11px] font-semibold text-[#2563EB] hover:bg-[#2563EB]/20 cursor-pointer"
                  >
                    {greetBotId === b.id ? "收起" : "发送欢迎语"}
                  </button>
                </td>
              </tr>
            ))}
            {bots.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-[#CBD5E1]">暂无 Bot</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {greetBotId && (
        <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
          <h3 className="mb-1 text-sm font-semibold text-[#1E40AF]">向用户发送欢迎语</h3>
          <p className="mb-3 text-xs text-[#60A5FA]">
            Bot 会主动给该用户发一条消息，用户的 App 聊天列表中就会出现此 Bot
          </p>
          {greetResult && (
            <div className={`mb-3 rounded-lg px-3 py-2 text-sm ${greetResult.ok ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
              {greetResult.msg}
            </div>
          )}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#60A5FA]">目标用户</label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="block w-full rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#2563EB] cursor-pointer"
              >
                <option value="">选择用户…</option>
                {imUsers.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.displayName}（{u.userId.length > 16 ? u.userId.slice(0, 8) + "…" : u.userId}）
                  </option>
                ))}
              </select>
              {imUsers.length === 0 && (
                <p className="mt-1 text-[10px] text-[#F59E0B]">未找到用户，请确认有用户登录了 App</p>
              )}
            </div>
            <div className="flex-[2]">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#60A5FA]">欢迎语（可选）</label>
              <input
                placeholder="默认：你好！我是XX，有什么可以帮您的吗？"
                value={greetMsg}
                onChange={(e) => setGreetMsg(e.target.value)}
                className="block w-full rounded-lg border border-[#BFDBFE] bg-white px-3 py-2 text-sm text-[#0F172A] outline-none placeholder:text-[#93C5FD] focus:border-[#2563EB]"
              />
            </div>
            <button
              onClick={handleGreet}
              disabled={greetLoading || !targetUserId}
              className="rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white shadow shadow-[#2563EB]/15 disabled:opacity-50 cursor-pointer"
            >
              {greetLoading ? "发送中…" : "发送"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Delete old robot frontend files**

```bash
rm src/components/robot-form.tsx
rm src/app/dashboard/admin/robots/page.tsx
rmdir src/app/dashboard/admin/robots 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add src/components/bot-form.tsx src/app/dashboard/admin/bots/page.tsx
git rm src/components/robot-form.tsx src/app/dashboard/admin/robots/page.tsx
git commit -m "feat: replace robot frontend with bot frontend"
```

---

### Task 10: Update Workbench & Session Components (robot -> bot)

**Files:**
- Modify: `src/app/dashboard/workbench/page.tsx`
- Modify: `src/components/session-list.tsx`
- Modify: `src/components/sidebar.tsx`

- [ ] **Step 1: Update workbench page types**

In `src/app/dashboard/workbench/page.tsx`, update the `Session` interface:

Replace:
```typescript
  robot?: { displayName: string };
```
With:
```typescript
  bot?: { displayName: string };
```

- [ ] **Step 2: Update session-list component**

Read `src/components/session-list.tsx` and replace any references to `robot` with `bot` in props types and rendered text.

- [ ] **Step 3: Update sidebar navigation**

Read `src/components/sidebar.tsx` and update the nav link:

Replace any reference to `/dashboard/admin/robots` with `/dashboard/admin/bots` and update the label from "机器人管理" to "Bot 管理".

- [ ] **Step 4: Verify full compilation**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/workbench/page.tsx src/components/session-list.tsx src/components/sidebar.tsx
git commit -m "refactor: update frontend components robot->bot references"
```

---

### Task 11: Delete Wildfire Module & Update Env

**Files:**
- Delete: `src/lib/wildfire.ts`
- Modify: `.env.example`

- [ ] **Step 1: Delete the wildfire module**

```bash
rm src/lib/wildfire.ts
```

- [ ] **Step 2: Update .env.example**

Replace the entire file:

```env
# 数据库连接
DATABASE_URL="postgresql://postgres:123456@localhost:5432/wildfire-cs"

# JWT 密钥（生产环境请修改为随机字符串）
JWT_SECRET="wildfire-cs-jwt-secret-change-in-production"

# OpenIM Server API 地址（从宿主机访问 Docker 容器）
OPENIM_API_URL="http://localhost:10002"
OPENIM_ADMIN_SECRET="openIM123"
OPENIM_ADMIN_USERID="imAdmin"

# Webhook 回调基地址（OpenIM 从 Docker 容器内部访问客服工作台）
# Docker Desktop (Mac/Windows): http://host.docker.internal:3000
# Linux: http://你的宿主机IP:3000
WEBHOOK_CALLBACK_BASE="http://host.docker.internal:3000"
```

- [ ] **Step 3: Verify no remaining wildfire imports**

Run: `grep -r "wildfire" src/ --include="*.ts" --include="*.tsx" -l`
Expected: No files found (empty output).

- [ ] **Step 4: Full type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git rm src/lib/wildfire.ts
git add .env.example
git commit -m "chore: remove wildfire module, update env for OpenIM"
```

---

### Task 12: Docker Compose & OpenIM Webhook Config

**Files:**
- Rewrite: `deploy/docker-compose.yml`
- Create: `deploy/openim/webhooks.yml`

- [ ] **Step 1: Create OpenIM webhook config**

```yaml
# deploy/openim/webhooks.yml
url: http://host.docker.internal:3000/api/webhook/openim

afterSendSingleMsg:
  enable: true
  timeout: 5
```

- [ ] **Step 2: Rewrite docker-compose for OpenIM**

```yaml
# deploy/docker-compose.yml

services:
  mongodb:
    image: mongo:7
    container_name: openim-mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: openim-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

  kafka:
    image: bitnami/kafka:3.7
    container_name: openim-kafka
    ports:
      - "9092:9092"
    environment:
      - KAFKA_CFG_NODE_ID=0
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka:9093
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
    volumes:
      - kafka-data:/bitnami/kafka
    restart: unless-stopped

  etcd:
    image: bitnami/etcd:3.5
    container_name: openim-etcd
    ports:
      - "2379:2379"
    environment:
      - ALLOW_NONE_AUTHENTICATION=yes
    volumes:
      - etcd-data:/bitnami/etcd
    restart: unless-stopped

  minio:
    image: minio/minio
    container_name: openim-minio
    ports:
      - "9000:9000"
      - "9090:9090"
    environment:
      - MINIO_ROOT_USER=openIM123
      - MINIO_ROOT_PASSWORD=openIM123
    command: server /data --console-address ":9090"
    volumes:
      - minio-data:/data
    restart: unless-stopped

  openim-server:
    image: openim/openim-server:latest
    container_name: openim-server
    ports:
      - "10001:10001"   # WebSocket (client)
      - "10002:10002"   # REST API
      - "10003:10003"   # gRPC (internal)
    environment:
      - MONGO_URI=mongodb://mongodb:27017/openim
      - REDIS_ADDRESS=redis:6379
      - KAFKA_ADDRESS=kafka:9092
      - ETCD_ADDRESS=http://etcd:2379
      - MINIO_ENDPOINT=minio:9000
      - MINIO_ACCESS_KEY=openIM123
      - MINIO_SECRET_KEY=openIM123
      - API_OPENIM_PORT=10002
      - OPENIM_SECRET=openIM123
    volumes:
      - ./openim/webhooks.yml:/openim/config/webhooks.yml:ro
    depends_on:
      - mongodb
      - redis
      - kafka
      - etcd
      - minio
    restart: unless-stopped

volumes:
  mongodb-data:
  redis-data:
  kafka-data:
  etcd-data:
  minio-data:
```

- [ ] **Step 3: Commit**

```bash
git add deploy/docker-compose.yml deploy/openim/webhooks.yml
git commit -m "feat: replace wildfire docker-compose with OpenIM service stack"
```

---

### Task 13: Clean Up Test Routes & Final Verification

**Files:**
- Check: `src/app/api/test/send/route.ts` (may reference wildfire)

- [ ] **Step 1: Check test routes for wildfire references**

Run: `grep -r "wildfire\|robot" src/app/api/test/ --include="*.ts" -l 2>/dev/null || echo "no test routes or no matches"`

If any files reference wildfire or robot, update them to use `imProvider` and `bot` terminology.

- [ ] **Step 2: Full type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Verify no wildfire references remain anywhere**

Run: `grep -ri "wildfire\|WILDFIRE" src/ prisma/ deploy/ .env.example --include="*.ts" --include="*.tsx" --include="*.prisma" --include="*.yml" --include="*.env*" -l`
Expected: No matches.

Run: `grep -ri "prisma\.robot\b" src/ --include="*.ts" --include="*.tsx" -l`
Expected: No matches.

- [ ] **Step 4: Start the dev server to smoke test**

Run: `npm run build 2>&1 | tail -20`
Expected: Build completes successfully.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup — remove all wildfire references"
```
