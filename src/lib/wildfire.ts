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
