# 野火 IM 客服工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack customer service workbench that receives messages from Wildfire IM users via Robot webhook, routes them to agents, and lets agents reply in real-time.

**Architecture:** Next.js App Router serves both the UI and API. Robot webhook endpoint receives messages from Wildfire IM Server, stores them in PostgreSQL via Prisma, and broadcasts to connected agents via SSE (EventEmitter singleton). Agents reply through API routes that call Wildfire Robot API. JWT in httpOnly cookies handles auth with admin/agent roles.

**Tech Stack:** Next.js (App Router), TypeScript, PostgreSQL, Prisma, Tailwind CSS v4, jose (JWT), bcryptjs, SSE (EventSource + ReadableStream)

---

## File Structure

```
wildfire-cs/
├── .env                              # Environment variables
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── seed.ts                       # Seed default admin user
├── src/
│   ├── app/
│   │   ├── globals.css               # Tailwind import
│   │   ├── layout.tsx                # Root layout (html/body)
│   │   ├── page.tsx                  # Redirect to /login
│   │   ├── login/
│   │   │   └── page.tsx              # Login page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx            # Dashboard shell (sidebar + header)
│   │   │   ├── page.tsx              # Redirect to /dashboard/workbench
│   │   │   ├── workbench/
│   │   │   │   └── page.tsx          # Agent workbench (session list + chat)
│   │   │   └── admin/
│   │   │       ├── robots/
│   │   │       │   └── page.tsx      # Robot management (admin only)
│   │   │       └── agents/
│   │   │           └── page.tsx      # Agent management (admin only)
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts    # POST: authenticate, set JWT cookie
│   │       │   ├── logout/route.ts   # POST: clear JWT cookie
│   │       │   └── me/route.ts       # GET: return current user from JWT
│   │       ├── admin/
│   │       │   ├── robots/route.ts   # GET: list robots, POST: create robot
│   │       │   └── agents/route.ts   # GET: list agents, POST: create agent
│   │       ├── webhook/
│   │       │   └── robot/route.ts    # POST: receive Wildfire IM robot callback
│   │       ├── sessions/
│   │       │   ├── route.ts          # GET: list sessions for current agent
│   │       │   └── [id]/
│   │       │       ├── route.ts      # PATCH: assign/close/transfer session
│   │       │       └── messages/
│   │       │           └── route.ts  # GET: messages for session, POST: send reply
│   │       └── sse/
│   │           └── route.ts          # GET: SSE stream for real-time updates
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma client singleton
│   │   ├── auth.ts                   # JWT sign/verify, getSession helper
│   │   ├── wildfire.ts               # Wildfire IM Admin API + Robot API client
│   │   └── event-bus.ts              # Global EventEmitter singleton for SSE
│   ├── hooks/
│   │   └── use-sse.ts                # Client-side SSE hook
│   └── components/
│       ├── login-form.tsx            # Login form component
│       ├── sidebar.tsx               # Dashboard sidebar navigation
│       ├── session-list.tsx          # List of chat sessions
│       ├── chat-panel.tsx            # Chat message display + input
│       ├── robot-form.tsx            # Create robot form
│       └── agent-form.tsx            # Create agent form
```

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `.env`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Initialize project and install dependencies**

```bash
cd /Users/chenhao/codes/myself/wildfire-cs
npm init -y
npm install next@latest react@latest react-dom@latest typescript @types/react @types/node
npm install tailwindcss @tailwindcss/postcss postcss
npm install prisma @prisma/client
npm install bcryptjs jose
npm install -D @types/bcryptjs tsx
```

- [ ] **Step 2: Create config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
```

`postcss.config.mjs`:
```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

`.env`:
```
DATABASE_URL="postgresql://postgres:123456@localhost:5432/wildfire-cs"
JWT_SECRET="wildfire-cs-jwt-secret-change-in-production"
WILDFIRE_IM_URL="http://localhost:80"
WILDFIRE_ADMIN_URL="http://localhost:18080"
WILDFIRE_ADMIN_SECRET="123456"
```

Update `package.json` scripts:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "npx tsx prisma/seed.ts"
  }
}
```

- [ ] **Step 3: Create root layout and entry page**

`src/app/globals.css`:
```css
@import "tailwindcss";
```

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "野火客服工作台",
  description: "Customer service workbench powered by Wildfire IM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/login");
}
```

- [ ] **Step 4: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts on http://localhost:3000, redirects to /login (404 is fine — login page comes in Task 3)

- [ ] **Step 5: Commit**

```bash
git init
echo "node_modules/\n.next/\n.env" > .gitignore
git add .
git commit -m "feat: initialize Next.js project with Tailwind and Prisma deps"
```

---

## Task 2: Database Schema and Seed

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: Create Prisma schema**

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  admin
  agent
}

enum SessionStatus {
  waiting
  active
  closed
}

enum SenderType {
  customer
  agent
  system
}

model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String   @map("password_hash")
  displayName  String   @map("display_name")
  role         Role     @default(agent)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  createdRobots Robot[]   @relation("CreatedBy")
  sessions      Session[] @relation("AgentSessions")

  @@map("users")
}

model Robot {
  id          String   @id @default(cuid())
  imUserId    String   @unique @map("im_user_id")
  name        String
  displayName String   @map("display_name")
  secret      String
  callbackUrl String?  @map("callback_url")
  createdById String   @map("created_by_id")
  createdBy   User     @relation("CreatedBy", fields: [createdById], references: [id])
  createdAt   DateTime @default(now()) @map("created_at")

  sessions Session[]

  @@map("robots")
}

model Session {
  id           String        @id @default(cuid())
  customerId   String        @map("customer_id")
  customerName String        @default("Unknown") @map("customer_name")
  robotId      String        @map("robot_id")
  robot        Robot         @relation(fields: [robotId], references: [id])
  agentId      String?       @map("agent_id")
  agent        User?         @relation("AgentSessions", fields: [agentId], references: [id])
  status       SessionStatus @default(waiting)
  createdAt    DateTime      @default(now()) @map("created_at")
  closedAt     DateTime?     @map("closed_at")

  messages Message[]

  @@map("sessions")
}

model Message {
  id          String     @id @default(cuid())
  sessionId   String     @map("session_id")
  session     Session    @relation(fields: [sessionId], references: [id])
  senderType  SenderType @map("sender_type")
  senderId    String     @map("sender_id")
  contentType Int        @default(1) @map("content_type")
  content     String
  imMessageId String?    @map("im_message_id")
  createdAt   DateTime   @default(now()) @map("created_at")

  @@index([sessionId, createdAt])
  @@map("messages")
}
```

- [ ] **Step 2: Create Prisma client singleton**

`src/lib/prisma.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 3: Create seed script**

`prisma/seed.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      displayName: "管理员",
      role: "admin",
    },
  });

  console.log("Seed complete: admin/admin123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 4: Run migration and seed**

```bash
npx prisma migrate dev --name init
npm run db:seed
```

Expected: Migration creates 4 tables. Seed inserts admin user. No errors.

- [ ] **Step 5: Verify with Prisma Studio**

Run: `npx prisma studio`
Expected: Opens browser, shows `users` table with 1 admin row.

- [ ] **Step 6: Commit**

```bash
git add prisma/ src/lib/prisma.ts
git commit -m "feat: add database schema and seed default admin user"
```

---

## Task 3: Authentication (JWT + API Routes)

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/app/api/auth/me/route.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Create auth library**

`src/lib/auth.ts`:
```ts
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "wildfire-cs-default-secret"
);

const COOKIE_NAME = "wf-cs-token";

export interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export { COOKIE_NAME };
```

- [ ] **Step 2: Create login API route**

`src/app/api/auth/login/route.ts`:
```ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!username || !password) {
    return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = await signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  const response = NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  });

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
```

- [ ] **Step 3: Create logout and me routes**

`src/app/api/auth/logout/route.ts`:
```ts
import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return response;
}
```

`src/app/api/auth/me/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, displayName: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
```

- [ ] **Step 4: Create middleware for route protection**

`src/middleware.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth required
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/webhook")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin-only routes
  if (pathname.startsWith("/dashboard/admin") || pathname.startsWith("/api/admin")) {
    if (payload.role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard/workbench", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

- [ ] **Step 5: Verify login flow with curl**

```bash
# Start dev server
npm run dev

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# Test /me
curl http://localhost:3000/api/auth/me -b cookies.txt

# Test logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

Expected: Login returns user JSON + sets cookie. /me returns user. Logout clears cookie.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/middleware.ts
git commit -m "feat: add JWT auth with login/logout/me and route protection middleware"
```

---

## Task 4: Login Page

**Files:**
- Create: `src/components/login-form.tsx`
- Create: `src/app/login/page.tsx`

- [ ] **Step 1: Create login form component**

`src/components/login-form.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "登录失败");
        return;
      }

      router.push("/dashboard/workbench");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          用户名
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          密码
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create login page**

`src/app/login/page.tsx`:
```tsx
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          野火客服工作台
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify login page renders and works**

Run: `npm run dev`, open http://localhost:3000
Expected: Redirects to /login, shows login form. Enter admin/admin123, redirects to /dashboard/workbench (404 is fine — dashboard comes next).

- [ ] **Step 4: Commit**

```bash
git add src/components/login-form.tsx src/app/login/
git commit -m "feat: add login page"
```

---

## Task 5: Dashboard Layout and Sidebar

**Files:**
- Create: `src/components/sidebar.tsx`
- Create: `src/app/dashboard/layout.tsx`
- Create: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create sidebar component**

`src/components/sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface SidebarProps {
  user: { displayName: string; role: string };
}

const navItems = [
  { href: "/dashboard/workbench", label: "工作台", roles: ["admin", "agent"] },
  { href: "/dashboard/admin/robots", label: "机器人管理", roles: ["admin"] },
  { href: "/dashboard/admin/agents", label: "客服管理", roles: ["admin"] },
];

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 px-4 py-4">
        <h2 className="text-lg font-bold text-gray-900">野火客服</h2>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems
          .filter((item) => item.roles.includes(user.role))
          .map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t border-gray-200 px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
        <p className="text-xs text-gray-500">{user.role === "admin" ? "管理员" : "客服"}</p>
        <button
          onClick={handleLogout}
          className="mt-2 text-sm text-red-600 hover:text-red-700"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create dashboard layout**

`src/app/dashboard/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, displayName: true, role: true },
  });

  if (!user) redirect("/login");

  return (
    <div className="flex h-screen">
      <Sidebar user={{ displayName: user.displayName, role: user.role }} />
      <main className="flex-1 overflow-auto bg-gray-50">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create dashboard index redirect**

`src/app/dashboard/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function DashboardIndex() {
  redirect("/dashboard/workbench");
}
```

- [ ] **Step 4: Create workbench placeholder page**

`src/app/dashboard/workbench/page.tsx`:
```tsx
export default function WorkbenchPage() {
  return (
    <div className="flex h-full items-center justify-center text-gray-400">
      工作台（即将实现）
    </div>
  );
}
```

- [ ] **Step 5: Verify dashboard shell**

Run: `npm run dev`, login with admin/admin123
Expected: Redirects to /dashboard/workbench. Left sidebar shows "野火客服" header, nav links (工作台, 机器人管理, 客服管理), and user info at bottom.

- [ ] **Step 6: Commit**

```bash
git add src/components/sidebar.tsx src/app/dashboard/
git commit -m "feat: add dashboard layout with sidebar navigation"
```

---

## Task 6: Wildfire IM API Client

**Files:**
- Create: `src/lib/wildfire.ts`

- [ ] **Step 1: Create Wildfire API client**

`src/lib/wildfire.ts`:
```ts
import crypto from "crypto";

const ADMIN_URL = process.env.WILDFIRE_ADMIN_URL || "http://localhost:18080";
const ADMIN_SECRET = process.env.WILDFIRE_ADMIN_SECRET || "123456";
const IM_URL = process.env.WILDFIRE_IM_URL || "http://localhost:80";

function makeSign(secret: string) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now().toString();
  const sign = crypto
    .createHash("sha1")
    .update(`${nonce}|${secret}|${timestamp}`)
    .digest("hex");
  return { nonce, timestamp, sign };
}

async function adminPost(path: string, body: Record<string, unknown>) {
  const { nonce, timestamp, sign } = makeSign(ADMIN_SECRET);
  const res = await fetch(`${ADMIN_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      nonce,
      timestamp,
      sign,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function robotPost(
  path: string,
  robotId: string,
  secret: string,
  body?: Record<string, unknown>
) {
  const { nonce, timestamp, sign } = makeSign(secret);
  const res = await fetch(`${IM_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      nonce,
      timestamp,
      sign,
      rid: robotId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// --- Admin API ---

export async function createRobot(params: {
  name: string;
  displayName: string;
  owner: string;
  callback?: string;
}): Promise<{ code: number; msg: string; result?: { userId: string; secret: string } }> {
  return adminPost("/admin/robot/create", {
    name: params.name,
    displayName: params.displayName,
    owner: params.owner,
    callback: params.callback || "",
  });
}

// --- Robot API ---

export async function robotSendMessage(
  robotId: string,
  secret: string,
  targetUserId: string,
  payload: { type: number; searchableContent?: string; content?: string }
) {
  return robotPost("/robot/message/send", robotId, secret, {
    sender: robotId,
    conv: { type: 0, target: targetUserId, line: 0 },
    payload,
  });
}

export async function setRobotCallback(
  robotId: string,
  secret: string,
  url: string
) {
  return robotPost("/robot/set_callback", robotId, secret, { url });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/wildfire.ts
git commit -m "feat: add Wildfire IM Admin and Robot API client"
```

---

## Task 7: Admin — Robot Management

**Files:**
- Create: `src/app/api/admin/robots/route.ts`
- Create: `src/components/robot-form.tsx`
- Create: `src/app/dashboard/admin/robots/page.tsx`

- [ ] **Step 1: Create robots API route**

`src/app/api/admin/robots/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createRobot, setRobotCallback } from "@/lib/wildfire";

export async function GET() {
  const robots = await prisma.robot.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { displayName: true } } },
  });
  return NextResponse.json({ robots });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, displayName, callbackUrl } = await request.json();

  if (!name || !displayName) {
    return NextResponse.json({ error: "名称和显示名不能为空" }, { status: 400 });
  }

  // Call Wildfire Admin API to create robot on IM server
  const imResult = await createRobot({
    name,
    displayName,
    owner: session.userId,
    callback: callbackUrl,
  });

  if (imResult.code !== 0) {
    return NextResponse.json(
      { error: `野火 IM 创建机器人失败: ${imResult.msg}` },
      { status: 502 }
    );
  }

  const { userId: imUserId, secret } = imResult.result!;

  // Set callback URL if provided
  if (callbackUrl) {
    await setRobotCallback(imUserId, secret, callbackUrl);
  }

  // Save to our database
  const robot = await prisma.robot.create({
    data: {
      imUserId,
      name,
      displayName,
      secret,
      callbackUrl,
      createdById: session.userId,
    },
  });

  return NextResponse.json({ robot }, { status: 201 });
}
```

- [ ] **Step 2: Create robot form component**

`src/components/robot-form.tsx`:
```tsx
"use client";

import { useState } from "react";

export function RobotForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/robots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, displayName, callbackUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "创建失败");
        return;
      }

      setName("");
      setDisplayName("");
      setCallbackUrl("");
      onCreated();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-medium text-gray-900">创建机器人</h3>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <input
        placeholder="名称 (英文标识)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="显示名称"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="Webhook 回调地址 (可选)"
        value={callbackUrl}
        onChange={(e) => setCallbackUrl(e.target.value)}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "创建中..." : "创建"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create robots management page**

`src/app/dashboard/admin/robots/page.tsx`:
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { RobotForm } from "@/components/robot-form";

interface Robot {
  id: string;
  imUserId: string;
  name: string;
  displayName: string;
  callbackUrl: string | null;
  createdAt: string;
  createdBy: { displayName: string };
}

export default function RobotsPage() {
  const [robots, setRobots] = useState<Robot[]>([]);

  const loadRobots = useCallback(async () => {
    const res = await fetch("/api/admin/robots");
    const data = await res.json();
    setRobots(data.robots);
  }, []);

  useEffect(() => { loadRobots(); }, [loadRobots]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">机器人管理</h1>

      <RobotForm onCreated={loadRobots} />

      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">显示名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">IM User ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">回调地址</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">创建者</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {robots.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">{r.displayName}</td>
                <td className="px-4 py-3 text-gray-500">{r.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.imUserId}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{r.callbackUrl || "—"}</td>
                <td className="px-4 py-3 text-gray-500">{r.createdBy.displayName}</td>
              </tr>
            ))}
            {robots.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  暂无机器人
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify robot management page**

Run: `npm run dev`, login as admin, navigate to /dashboard/admin/robots
Expected: Shows "创建机器人" form and empty table. (Creating a robot will fail if IM server is not running — that's expected. The form submission and error display should work.)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/robots/ src/components/robot-form.tsx src/app/dashboard/admin/robots/
git commit -m "feat: add admin robot management page with Wildfire IM integration"
```

---

## Task 8: Admin — Agent Management

**Files:**
- Create: `src/app/api/admin/agents/route.ts`
- Create: `src/components/agent-form.tsx`
- Create: `src/app/dashboard/admin/agents/page.tsx`

- [ ] **Step 1: Create agents API route**

`src/app/api/admin/agents/route.ts`:
```ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const agents = await prisma.user.findMany({
    where: { role: "agent" },
    select: { id: true, username: true, displayName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ agents });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { username, password, displayName } = await request.json();

  if (!username || !password || !displayName) {
    return NextResponse.json({ error: "所有字段都不能为空" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const agent = await prisma.user.create({
    data: { username, passwordHash, displayName, role: "agent" },
    select: { id: true, username: true, displayName: true, role: true },
  });

  return NextResponse.json({ agent }, { status: 201 });
}
```

- [ ] **Step 2: Create agent form component**

`src/components/agent-form.tsx`:
```tsx
"use client";

import { useState } from "react";

export function AgentForm({ onCreated }: { onCreated: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "创建失败");
        return;
      }

      setUsername("");
      setPassword("");
      setDisplayName("");
      onCreated();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-medium text-gray-900">创建客服</h3>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <input
        placeholder="用户名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="密码"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <input
        placeholder="显示名称"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "创建中..." : "创建"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Create agents management page**

`src/app/dashboard/admin/agents/page.tsx`:
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { AgentForm } from "@/components/agent-form";

interface Agent {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);

  const loadAgents = useCallback(async () => {
    const res = await fetch("/api/admin/agents");
    const data = await res.json();
    setAgents(data.agents);
  }, []);

  useEffect(() => { loadAgents(); }, [loadAgents]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">客服管理</h1>

      <AgentForm onCreated={loadAgents} />

      <div className="rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">显示名称</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">用户名</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">创建时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3">{a.displayName}</td>
                <td className="px-4 py-3 text-gray-500">{a.username}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(a.createdAt).toLocaleString("zh-CN")}
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  暂无客服
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify agents page**

Run: `npm run dev`, login as admin, navigate to /dashboard/admin/agents
Expected: Shows form and empty table. Create an agent, it appears in the table.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/agents/ src/components/agent-form.tsx src/app/dashboard/admin/agents/
git commit -m "feat: add admin agent management page"
```

---

## Task 9: SSE Event Bus and Endpoint

**Files:**
- Create: `src/lib/event-bus.ts`
- Create: `src/app/api/sse/route.ts`
- Create: `src/hooks/use-sse.ts`

- [ ] **Step 1: Create event bus singleton**

`src/lib/event-bus.ts`:
```ts
import { EventEmitter } from "events";

const key = Symbol.for("wildfire-cs.eventBus");
const g = globalThis as Record<symbol, EventEmitter | undefined>;

if (!g[key]) {
  g[key] = new EventEmitter();
  g[key]!.setMaxListeners(0);
}

export const eventBus: EventEmitter = g[key]!;
```

- [ ] **Step 2: Create SSE route**

`src/app/api/sse/route.ts`:
```ts
import { eventBus } from "@/lib/event-bus";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Authenticate via cookie
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return new Response("Unauthorized", { status: 401 });
  }

  const agentId = payload.userId;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected", agentId })}\n\n`)
      );

      // Handler for events targeted at this agent or broadcast
      const handler = (data: { targetAgentId?: string; [key: string]: unknown }) => {
        // Send if broadcast (no targetAgentId) or targeted at this agent
        if (!data.targetAgentId || data.targetAgentId === agentId) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            // client disconnected
          }
        }
      };

      eventBus.on("cs-event", handler);

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          // client disconnected
        }
      }, 15_000);

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        eventBus.off("cs-event", handler);
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

- [ ] **Step 3: Create client-side SSE hook**

`src/hooks/use-sse.ts`:
```tsx
"use client";

import { useEffect, useRef, useCallback, useState } from "react";

type SSEHandler = (data: Record<string, unknown>) => void;

export function useSSE(onMessage: SSEHandler) {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onMessage);
  handlerRef.current = onMessage;

  useEffect(() => {
    const es = new EventSource("/api/sse");

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handlerRef.current(data);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      setConnected(false);
    };
  }, []);

  return { connected };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/event-bus.ts src/app/api/sse/ src/hooks/use-sse.ts
git commit -m "feat: add SSE event bus and real-time push endpoint"
```

---

## Task 10: Webhook — Receive Messages from Wildfire IM

**Files:**
- Create: `src/app/api/webhook/robot/route.ts`

- [ ] **Step 1: Create webhook route**

`src/app/api/webhook/robot/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";

interface WildfireMessage {
  messageId: number;
  sender: string;
  conv: { type: number; target: string; line: number };
  payload: {
    type: number;
    searchableContent?: string;
    content?: string;
  };
  senderUserInfo?: {
    userId: string;
    displayName?: string;
    portrait?: string;
  };
  timestamp: number;
}

export async function POST(request: Request) {
  const msg: WildfireMessage = await request.json();

  // Only handle private messages (conv.type === 0)
  if (msg.conv.type !== 0) {
    return NextResponse.json({ ok: true });
  }

  const robotImUserId = msg.conv.target;
  const customerId = msg.sender;
  const customerName = msg.senderUserInfo?.displayName || customerId;
  const content = msg.payload.searchableContent || msg.payload.content || "";

  // Find the robot in our database
  const robot = await prisma.robot.findUnique({
    where: { imUserId: robotImUserId },
  });

  if (!robot) {
    console.warn(`Webhook: unknown robot ${robotImUserId}`);
    return NextResponse.json({ ok: true });
  }

  // Find or create an active session for this customer + robot
  let session = await prisma.session.findFirst({
    where: {
      customerId,
      robotId: robot.id,
      status: { in: ["waiting", "active"] },
    },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        customerId,
        customerName,
        robotId: robot.id,
        status: "waiting",
      },
    });

    // Broadcast new session to all agents
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
      contentType: msg.payload.type,
      content,
      imMessageId: msg.messageId.toString(),
    },
  });

  // Push message to assigned agent (or broadcast if waiting)
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

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify webhook with curl**

```bash
curl -X POST http://localhost:3000/api/webhook/robot \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": 12345,
    "sender": "test_user_001",
    "conv": { "type": 0, "target": "ROBOT_IM_USER_ID_HERE", "line": 0 },
    "payload": { "type": 1, "searchableContent": "你好，我需要帮助" },
    "senderUserInfo": { "userId": "test_user_001", "displayName": "测试用户" },
    "timestamp": 1711785600000
  }'
```

Expected: Returns `{ ok: true }`. If the robot IM user ID matches a robot in the database, a session and message are created. (If no matching robot, a warning is logged but still returns ok.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhook/
git commit -m "feat: add webhook endpoint for Wildfire IM robot callbacks"
```

---

## Task 11: Sessions and Messages API

**Files:**
- Create: `src/app/api/sessions/route.ts`
- Create: `src/app/api/sessions/[id]/route.ts`
- Create: `src/app/api/sessions/[id]/messages/route.ts`

- [ ] **Step 1: Create sessions list route**

`src/app/api/sessions/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  // Agents see their assigned sessions + waiting sessions
  // Admins see all sessions
  if (session.role === "agent") {
    where.OR = [
      { agentId: session.userId },
      { status: "waiting" },
    ];
  }

  const sessions = await prisma.session.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      agent: { select: { displayName: true } },
      robot: { select: { displayName: true } },
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ sessions });
}
```

- [ ] **Step 2: Create session detail route (assign/close/transfer)**

`src/app/api/sessions/[id]/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action, targetAgentId } = body as {
    action: "assign" | "close" | "transfer";
    targetAgentId?: string;
  };

  const csSession = await prisma.session.findUnique({ where: { id } });
  if (!csSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (action === "assign") {
    const updated = await prisma.session.update({
      where: { id },
      data: { agentId: session.userId, status: "active" },
    });

    // Notify: session assigned
    eventBus.emit("cs-event", {
      type: "session-updated",
      session: {
        id: updated.id,
        status: updated.status,
        agentId: updated.agentId,
      },
    });

    return NextResponse.json({ session: updated });
  }

  if (action === "close") {
    const updated = await prisma.session.update({
      where: { id },
      data: { status: "closed", closedAt: new Date() },
    });

    eventBus.emit("cs-event", {
      type: "session-updated",
      session: { id: updated.id, status: updated.status },
    });

    return NextResponse.json({ session: updated });
  }

  if (action === "transfer" && targetAgentId) {
    const updated = await prisma.session.update({
      where: { id },
      data: { agentId: targetAgentId },
    });

    // Notify new agent
    eventBus.emit("cs-event", {
      type: "session-updated",
      targetAgentId,
      session: {
        id: updated.id,
        status: updated.status,
        agentId: updated.agentId,
        customerId: updated.customerId,
        customerName: updated.customerName,
      },
    });

    return NextResponse.json({ session: updated });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

- [ ] **Step 3: Create messages route (list + send reply)**

`src/app/api/sessions/[id]/messages/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventBus } from "@/lib/event-bus";
import { robotSendMessage } from "@/lib/wildfire";

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

  // Get the CS session with robot info
  const csSession = await prisma.session.findUnique({
    where: { id },
    include: { robot: true },
  });

  if (!csSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (csSession.status !== "active") {
    return NextResponse.json({ error: "会话未激活" }, { status: 400 });
  }

  // Save message to database
  const message = await prisma.message.create({
    data: {
      sessionId: id,
      senderType: "agent",
      senderId: session.userId,
      contentType: 1,
      content,
    },
  });

  // Send via Wildfire Robot API
  try {
    await robotSendMessage(
      csSession.robot.imUserId,
      csSession.robot.secret,
      csSession.customerId,
      { type: 1, searchableContent: content }
    );
  } catch (err) {
    console.error("Failed to send via Wildfire:", err);
    // Message is saved locally even if IM send fails
  }

  // Push to SSE (for multi-tab or admin monitoring)
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

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sessions/
git commit -m "feat: add sessions and messages API with Wildfire IM reply integration"
```

---

## Task 12: Agent Workbench — Session List

**Files:**
- Create: `src/components/session-list.tsx`

- [ ] **Step 1: Create session list component**

`src/components/session-list.tsx`:
```tsx
"use client";

interface Session {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
  agentId: string | null;
  createdAt: string;
  agent?: { displayName: string } | null;
  robot?: { displayName: string };
  _count?: { messages: number };
}

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelect: (session: Session) => void;
  onAssign: (sessionId: string) => void;
}

export function SessionList({ sessions, activeSessionId, onSelect, onAssign }: SessionListProps) {
  const waiting = sessions.filter((s) => s.status === "waiting");
  const active = sessions.filter((s) => s.status === "active");

  return (
    <div className="flex h-full flex-col">
      {waiting.length > 0 && (
        <div>
          <div className="px-3 py-2 text-xs font-medium uppercase text-gray-500">
            等待接入 ({waiting.length})
          </div>
          {waiting.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between border-b border-gray-100 px-3 py-2 hover:bg-gray-50"
            >
              <div>
                <div className="text-sm font-medium">{s.customerName}</div>
                <div className="text-xs text-gray-400">
                  {new Date(s.createdAt).toLocaleTimeString("zh-CN")}
                </div>
              </div>
              <button
                onClick={() => onAssign(s.id)}
                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >
                接入
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2 text-xs font-medium uppercase text-gray-500">
          我的会话 ({active.length})
        </div>
        {active.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelect(s)}
            className={`cursor-pointer border-b border-gray-100 px-3 py-2 hover:bg-gray-50 ${
              activeSessionId === s.id ? "bg-blue-50" : ""
            }`}
          >
            <div className="text-sm font-medium">{s.customerName}</div>
            <div className="text-xs text-gray-400">
              {s._count?.messages || 0} 条消息
            </div>
          </div>
        ))}
        {active.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-gray-400">暂无会话</div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/session-list.tsx
git commit -m "feat: add session list component"
```

---

## Task 13: Agent Workbench — Chat Panel

**Files:**
- Create: `src/components/chat-panel.tsx`

- [ ] **Step 1: Create chat panel component**

`src/components/chat-panel.tsx`:
```tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  senderType: string;
  senderId: string;
  content: string;
  contentType: number;
  createdAt: string;
}

interface ChatPanelProps {
  sessionId: string;
  customerName: string;
  messages: Message[];
  onSend: (content: string) => void;
  onClose: () => void;
}

export function ChatPanel({ sessionId, customerName, messages, onSend, onClose }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <span className="font-medium text-gray-900">{customerName}</span>
          <span className="ml-2 text-xs text-gray-400">{sessionId.slice(0, 8)}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
        >
          结束会话
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
        {messages.map((msg) => {
          const isAgent = msg.senderType === "agent";
          const isSystem = msg.senderType === "system";

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center text-xs text-gray-400">
                {msg.content}
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                  isAgent
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {msg.content}
                <div
                  className={`mt-1 text-xs ${
                    isAgent ? "text-blue-200" : "text-gray-400"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString("zh-CN")}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 px-4 py-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat-panel.tsx
git commit -m "feat: add chat panel component"
```

---

## Task 14: Agent Workbench — Full Page Assembly

**Files:**
- Modify: `src/app/dashboard/workbench/page.tsx`

- [ ] **Step 1: Assemble workbench page with SSE integration**

Replace `src/app/dashboard/workbench/page.tsx`:
```tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { SessionList } from "@/components/session-list";
import { ChatPanel } from "@/components/chat-panel";
import { useSSE } from "@/hooks/use-sse";

interface Session {
  id: string;
  customerId: string;
  customerName: string;
  status: string;
  agentId: string | null;
  createdAt: string;
  agent?: { displayName: string } | null;
  robot?: { displayName: string };
  _count?: { messages: number };
}

interface Message {
  id: string;
  senderType: string;
  senderId: string;
  content: string;
  contentType: number;
  createdAt: string;
}

export default function WorkbenchPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions);
    }
  }, []);

  const loadMessages = useCallback(async (sessionId: string) => {
    const res = await fetch(`/api/sessions/${sessionId}/messages`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }, []);

  // SSE handler for real-time updates
  const handleSSE = useCallback(
    (data: Record<string, unknown>) => {
      const eventType = data.type as string;

      if (eventType === "new-session" || eventType === "session-updated") {
        loadSessions();
      }

      if (eventType === "new-message") {
        const msgSessionId = data.sessionId as string;
        // If viewing this session, append the message
        if (activeSession && msgSessionId === activeSession.id) {
          const msg = data.message as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
        // Refresh session list for unread counts
        loadSessions();
      }
    },
    [activeSession, loadSessions]
  );

  const { connected } = useSSE(handleSSE);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    }
  }, [activeSession, loadMessages]);

  async function handleAssign(sessionId: string) {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign" }),
    });

    if (res.ok) {
      await loadSessions();
      const data = await res.json();
      setActiveSession(data.session);
    }
  }

  async function handleSend(content: string) {
    if (!activeSession) return;

    await fetch(`/api/sessions/${activeSession.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    // Message will arrive via SSE, but also refresh immediately
    loadMessages(activeSession.id);
  }

  async function handleClose() {
    if (!activeSession) return;

    await fetch(`/api/sessions/${activeSession.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });

    setActiveSession(null);
    setMessages([]);
    loadSessions();
  }

  return (
    <div className="flex h-full">
      {/* Left: Session List */}
      <div className="w-72 border-r border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-3 py-3">
          <span className="text-sm font-medium text-gray-900">会话列表</span>
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        </div>
        <SessionList
          sessions={sessions}
          activeSessionId={activeSession?.id || null}
          onSelect={setActiveSession}
          onAssign={handleAssign}
        />
      </div>

      {/* Right: Chat Panel */}
      <div className="flex-1">
        {activeSession ? (
          <ChatPanel
            sessionId={activeSession.id}
            customerName={activeSession.customerName}
            messages={messages}
            onSend={handleSend}
            onClose={handleClose}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            选择一个会话开始服务
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify full workbench flow**

1. `npm run dev`
2. Login as admin → navigate to /dashboard/workbench
3. Open another terminal and simulate a webhook:

```bash
# First, note a robot's IM user ID from /dashboard/admin/robots
# Or simulate with a POST:
curl -X POST http://localhost:3000/api/webhook/robot \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": 99999,
    "sender": "customer_001",
    "conv": { "type": 0, "target": "ROBOT_IM_USER_ID", "line": 0 },
    "payload": { "type": 1, "searchableContent": "你好，我有个问题" },
    "senderUserInfo": { "userId": "customer_001", "displayName": "客户小明" },
    "timestamp": 1711785600000
  }'
```

Expected: A "等待接入" session appears in the session list. Click "接入" → session moves to "我的会话". Click it → chat panel shows the customer message. Type a reply → message appears in chat (Wildfire API call may fail if IM server not running, but the local message flow works).

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/workbench/
git commit -m "feat: assemble agent workbench with session list, chat panel, and SSE"
```

---

## Task 15: Update Root Page Redirect

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update root to check auth**

`src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard/workbench");
  }
  redirect("/login");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: root page redirects based on auth state"
```

---

## Task 16: End-to-End Verification

- [ ] **Step 1: Fresh database reset and seed**

```bash
npx prisma migrate reset --force
npm run db:seed
```

Expected: Clean database with admin user.

- [ ] **Step 2: Start dev server and test full flow**

```bash
npm run dev
```

Verification checklist:
1. Open http://localhost:3000 → redirects to /login
2. Login with admin/admin123 → redirects to /dashboard/workbench
3. Navigate to 机器人管理 → form renders, table is empty
4. Navigate to 客服管理 → create an agent (e.g. agent1/pass123/客服小王)
5. Logout → login as agent1 → only sees 工作台 in sidebar (no admin links)
6. From another terminal, simulate webhook message (use curl from Task 14 Step 2)
7. Session appears in waiting queue → click 接入 → chat panel shows message
8. Type reply → message appears in chat
9. Click 结束会话 → session disappears from active list

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete wildfire IM customer service workbench v1"
```
