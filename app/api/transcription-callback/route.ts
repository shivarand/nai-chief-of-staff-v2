import { NextRequest, NextResponse } from 'next/server';
import { getTranscript } from '@/lib/assemblyai';
import { askClaude } from '@/lib/claude';
import { pushMessage } from '@/lib/line';
import { saveConversation, getTranscriptionJob, completeTranscriptionJob } from '@/lib/memory';

export async function POST(req: NextRequest) {
  // Verify this is from AssemblyAI
  const webhookSecret = req.headers.get('x-webhook-secret');
  if (webhookSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const transcriptId = body.transcript_id;
  const status = body.status;

  console.log('AssemblyAI callback:', transcriptId, status);

  if (status !== 'completed') {
    // Not ready yet or error
    if (status === 'error') {
      const job = await getTranscriptionJob(transcriptId);
      if (job) {
        await pushMessage('Sorry — could not transcribe that recording. Please try again or send a shorter clip.');
      }
    }
    return NextResponse.json({ status: 'acknowledged' });
  }

  try {
    // Get the job details from Supabase
    const job = await getTranscriptionJob(transcriptId);
    if (!job) {
      console.error('Job not found:', transcriptId);
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.status === 'completed') {
  console.log('Already processed, skipping:', transcriptId);
  return NextResponse.json({ status: 'already processed' });
}

    // Get the full transcript
    const transcriptText = await getTranscript(transcriptId);

    // Send to Claude for analysis
    const userMessage = `[Meeting/audio recording transcribed - ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}]:\n\n${transcriptText}`;
    const analysis = await askClaude(userMessage);

    // Push result to LINE user
    await pushMessage(`🎙️ Recording processed:\n\n${analysis}`);

    // Save to memory
    await saveConversation(userMessage, analysis, 'voice');
    await completeTranscriptionJob(transcriptId);

  } catch (error) {
    console.error('Transcription callback error:', error);
    await pushMessage('Recording was transcribed but something went wrong with the analysis. Please try again.');
  }

  return NextResponse.json({ status: 'processed' });
}
