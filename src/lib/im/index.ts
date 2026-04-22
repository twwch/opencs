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
