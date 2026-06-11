import { NextRequest, NextResponse } from 'next/server';
import { replyMessage, validateSignature, getLineContent } from '@/lib/line';
import { askClaude } from '@/lib/claude';
import { saveConversation } from '@/lib/memory';


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
        userMessage = event.message.text;
        messageType = 'text';

    } else if (event.message.type === 'audio' || event.message.type === 'file') {
      // Handle voice messages and file attachments asynchronously via AssemblyAI
      messageType = 'voice';

      try {
        const { uploadAudio, submitTranscription } = await import('@/lib/assemblyai');
        const { saveTranscriptionJob } = await import('@/lib/memory');

        // Reply immediately so user knows it's being processed
        await replyMessage(replyToken, '🎙️ Got your recording! Processing it now...\n\nI\'ll send you the full analysis in 1-2 minutes.');

        // Get audio content from LINE
        const audioBuffer = await getLineContent(event.message.id);

        // Upload to AssemblyAI
        const uploadUrl = await uploadAudio(audioBuffer);

        // Submit for transcription with webhook callback URL
        const webhookUrl = `https://nai-chief-of-staff-v2.vercel.app/api/transcription-callback`;
        const transcriptId = await submitTranscription(uploadUrl, webhookUrl);

        // Save job to Supabase so we know which LINE user to notify
        const lineUserId = event.source?.userId || process.env.LINE_USER_ID || '';
        await saveTranscriptionJob(transcriptId, lineUserId);

        console.log('Transcription job submitted:', transcriptId);

        // Skip the normal Claude processing for this message type
        continue;

      } catch (error) {
        console.error('AssemblyAI error:', error);
        await replyMessage(replyToken, 'Could not process that recording. Try again or send a shorter clip.');
        continue;
      }

    } else if (event.message.type === 'image') {
        messageType = 'image';
        const imageBuffer = await getLineContent(event.message.id);
        const base64Image = imageBuffer.toString('base64');

        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const { buildMemoryContext } = await import('@/lib/memory');
        const memoryContext = await buildMemoryContext();

        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: `You are Nai's AI chief of staff. Analyze this image in the context of his businesses: Planet Furniture factory, MuCat cat hotel, or stone sink products. Be direct and specific.${memoryContext ? ' Context: ' + memoryContext : ''}`,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Image } },
              { type: 'text', text: 'What do you see? Is there anything I should act on for my businesses?' }
            ]
          }]
        });

        const reply = response.content[0].type === 'text'
          ? response.content[0].text
          : 'Could not analyze image.';

        await replyMessage(replyToken, reply);
        await saveConversation('[Image sent]', reply, 'image');
        continue;

      } else {
        continue;
      }

      const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      const reply = await askClaude(`[${now}]\n\n${userMessage}`);

      await replyMessage(replyToken, reply);
      await saveConversation(userMessage, reply, messageType);

    } catch (error) {
      console.error('Webhook error:', error);
      try {
        await replyMessage(replyToken, 'An error occurred while processing your message.');
      } catch (e) {
        console.error('Reply error:', e);
      }
    }
  }

  return NextResponse.json({ status: 'ok' });
}
