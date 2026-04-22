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
