import { NextRequest, NextResponse } from "next/server";
import { replyMessage, validateSignature } from "@/lib/line";
import { askClaude } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") || "";

  if (!validateSignature(rawBody, signature)) {
    console.error("Invalid LINE signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events || [];

  for (const event of events) {
    if (event.source?.userId) {
      console.log("LINE User ID:", event.source.userId);
    }

    if (event.type === "message" && event.message?.type === "text") {
      const userText = event.message.text;
      const replyToken = event.replyToken;

      try {
        const now = new Date().toLocaleString("th-TH", {
          timeZone: "Asia/Bangkok",
        });
        const fullMessage = `[Current time in Thailand: ${now}]\n\n${userText}`;
        const reply = await askClaude(fullMessage);
        await replyMessage(replyToken, reply);
      } catch (error) {
        console.error("Error processing message:", error);
        await replyMessage(
          replyToken,
          "Something went wrong. Try again in a moment."
        );
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
