import crypto from "crypto";

export async function replyMessage(replyToken: string, text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("LINE reply error:", err);
  }
}

export async function pushMessage(text: string) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: process.env.LINE_USER_ID,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("LINE push error:", err);
  }
}

export function validateSignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET || "";
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");
  return hash === signature;
}
