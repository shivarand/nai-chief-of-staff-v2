export async function transcribeVoice(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append("file", blob, "audio.m4a");
  formData.append("model", "whisper-1");
  formData.append("language", "th"); // Thai primary, also understands English

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Whisper error:", err);
    throw new Error("Voice transcription failed");
  }

  const data = await response.json();
  return data.text;
}
