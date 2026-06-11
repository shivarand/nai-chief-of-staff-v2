import { NextRequest, NextResponse } from 'next/server';
import { replyMessage, validateSignature, getLineContent } from '@/lib/line';
import { askClaude } from '@/lib/claude';
import { saveConversation, updateTodaySummary } from '@/lib/memory';
import { transcribeVoice } from '@/lib/voice';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature') || '';

  if (!validateSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const events = body.events || [];

  for (const event of events) {
    if (event.type !== 'message') continue;

    const replyToken = event.replyToken;
    let userMessage = '';
    let messageType = 'text';

    try {
      if (event.message.type === 'text') {
        // Text message
        userMessage = event.message.text;
        messageType = 'text';

      } else if (event.message.type === 'audio') {
  messageType = 'voice';
  try {
    const fileBuffer = await getLineContent(event.message.id);
    userMessage = await transcribeVoice(fileBuffer, 'audio/m4a');
    userMessage = `[File transcribed]: ${userMessage}`;
  } catch (error) {
    await replyMessage(replyToken, 'Could not process that file. Try sending a voice message instead.');
    continue;
  }
        // Voice message — transcribe with Whisper
        messageType = 'voice';
        const audioBuffer = await getLineContent(event.message.id);
        userMessage = await transcribeVoice(audioBuffer, 'audio/m4a');
        userMessage = `[Voice message transcribed]: ${userMessage}`;

      } else if (event.message.type === 'image') {
        // Image — send to Claude Vision
        messageType = 'image';
        const imageBuffer = await getLineContent(event.message.id);
        const base64Image = imageBuffer.toString('base64');

        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const memoryContext = await (await import('@/lib/memory')).buildMemoryContext();

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: `You are Nai's AI chief of staff. Analyze this image in the context of his businesses: Planet Furniture factory, MuCat cat hotel, or stone sink products. Be direct and specific. ${memoryContext ? 'Context: ' + memoryContext : ''}`,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
              { type: 'text', text: 'What do you see? Is there anything I should act on for my businesses?' }
            ]
          }]
        });

        const reply = response.content[0].type === 'text' ? response.content[0].text : 'Could not analyze image.';
        await replyMessage(replyToken, reply);
        await saveConversation('[Image sent]', reply, 'image');
        continue;

      } else {
        continue; // Skip stickers, files, etc.
      }

      // Get Claude response with memory
      const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      const reply = await askClaude(`[${now}]\n\n${userMessage}`);

      // Reply to user
      await replyMessage(replyToken, reply);

      // Save to memory
      await saveConversation(userMessage, reply, messageType);

    } catch (error) {
      console.error('Webhook error:', error);
      await replyMessage(replyToken, 'An error occurred while processing your message.');
    }
  }

  return NextResponse.json({ status: 'ok' });
}
