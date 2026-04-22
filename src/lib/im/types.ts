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
