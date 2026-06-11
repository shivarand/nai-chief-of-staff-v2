import { NextResponse } from 'next/server';
import crypto from 'crypto';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot/message';

export async function replyMessage(replyToken: string, message: string) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
  };

  const messages = splitMessage(message, 2000).map(text => ({ type: 'text', text }));

  const body = JSON.stringify({
    replyToken: replyToken,
    messages: messages,
  });

  const response = await fetch(`${LINE_MESSAGING_API}/reply`, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LINE Reply Error:', errorText);
    throw new Error(`LINE Reply failed: ${response.status} ${errorText}`);
  }
}

export async function pushMessage(message: string) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
  };

  // Assuming LINE_USER_ID is set for pushing messages
  if (!process.env.LINE_USER_ID) {
    console.error('LINE_USER_ID is not set. Cannot push message.');
    return;
  }

  const messages = splitMessage(message, 2000).map(text => ({ type: 'text', text }));

  const body = JSON.stringify({
    to: process.env.LINE_USER_ID,
    messages: messages,
  });

  const response = await fetch(`${LINE_MESSAGING_API}/push`, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LINE Push Error:', errorText);
    throw new Error(`LINE Push failed: ${response.status} ${errorText}`);
  }
}

export async function getLineContent(messageId: string): Promise<Buffer> {
  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { 'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` }
  });

  if (!res.ok) throw new Error(`Failed to get content: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function validateSignature(body: string, signature: string): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64');
  return hash === signature;
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    chunks.push(remaining.slice(0, maxLength));
    remaining = remaining.slice(maxLength);
  }
  return chunks;
}
