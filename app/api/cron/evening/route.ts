import { NextRequest, NextResponse } from 'next/server';
import { pushMessage } from '@/lib/line';
import { askClaude } from '@/lib/claude';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const prompt = `Generate Nai's evening check-in. Keep it short and direct.

Format:
End of day check-in 🌆

━━━━━━━━━━
CLOSE THE DAY
━━━━━━━━━━
Answer these three — reply back:

1. What did you actually complete today?
2. Single most important thing carrying to tomorrow?
3. Energy leaving today (1-10)?

[One direct coaching note about tomorrow based on Phoenix Protocol — reference any open tasks or patterns you know about from memory]`;

  try {
    const message = await askClaude(prompt);
    await pushMessage(message);
    return NextResponse.json({ status: 'evening check-in sent' });
  } catch (error) {
    console.error('Evening cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
