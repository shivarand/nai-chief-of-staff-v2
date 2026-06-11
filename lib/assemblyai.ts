const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY!;
const BASE_URL = 'https://api.assemblyai.com/v2';

// Upload audio buffer to AssemblyAI and get upload URL
export async function uploadAudio(audioBuffer: Buffer): Promise<string> {
  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      'authorization': ASSEMBLYAI_API_KEY,
      'content-type': 'application/octet-stream'
    },
    body: audioBuffer as unknown as BodyInit
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AssemblyAI upload failed: ${err}`);
  }

  const data = await response.json();
  return data.upload_url;
}

// Submit transcription job and get transcript ID
export async function submitTranscription(
  uploadUrl: string,
  webhookUrl: string
): Promise<string> {
  const response = await fetch(`${BASE_URL}/transcript`, {
    method: 'POST',
    headers: {
      'authorization': ASSEMBLYAI_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      audio_url: uploadUrl,
      language_detection: true,      // auto-detect Thai/English
      webhook_url: webhookUrl,        // AssemblyAI calls this when done
      webhook_auth_header_name: 'x-webhook-secret',
      webhook_auth_header_value: process.env.CRON_SECRET
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AssemblyAI transcription submit failed: ${err}`);
  }

  const data = await response.json();
  return data.id;
}

// Get completed transcript text
export async function getTranscript(transcriptId: string): Promise<string> {
  const response = await fetch(`${BASE_URL}/transcript/${transcriptId}`, {
    headers: { 'authorization': ASSEMBLYAI_API_KEY }
  });

  if (!response.ok) {
    throw new Error(`Failed to get transcript: ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== 'completed') {
    throw new Error(`Transcript not ready: ${data.status}`);
  }

  return data.text;
}
