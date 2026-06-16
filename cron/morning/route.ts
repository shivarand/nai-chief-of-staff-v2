import { NextRequest, NextResponse } from 'next/server';
import { pushMessage } from '@/lib/line';
import { askClaude } from '@/lib/claude';
import { getOpenTasks, getOpenLoops } from '@/lib/memory';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toLocaleDateString('en-GB', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const openTasks = await getOpenTasks();
  const taskSummary = openTasks.length > 0
    ? openTasks.slice(0, 8).map((t: any) => `[${t.business}] ${t.task}`).join('\n')
    : 'No open tasks recorded yet';

  const openLoops = await getOpenLoops();
  const loopsText = openLoops.length > 0
    ? openLoops.slice(0, 5).map((l: any) => `- ${l.question}`).join('\n')
    : 'None outstanding';

  const prompt = `CRITICAL SUMMARY RULES:
- Never alter or invent people's names, dates, financial figures, or who-is-traveling.
- If a detail is unclear, OMIT it rather than guessing.
- Preserve the two-part loan status exactly (15M refinance submitted; equipment not yet filed).
- Do not introduce any name not explicitly stated by Nai.

Generate Nai's morning briefing. Today is ${now}.

Open tasks in system:
${taskSummary}

Format:
Good morning Nai 🌅

[One sentence — what today needs to be about for Phoenix Protocol]

━━━━━━━━━━
TODAY'S FOCUS
━━━━━━━━━━
• [MIT 1 — most important task]
• [MIT 2]
• [MIT 3]

━━━━━━━━━━
OPEN ITEMS TO CLOSE THIS WEEK
━━━━━━━━━━
[2-3 most urgent open tasks from the list above]

━━━━━━━━━━
STILL WAITING ON YOUR ANSWER
━━━━━━━━━━
${loopsText}

━━━━━━━━━━
ONE QUESTION
━━━━━━━━━━
[One direct question about something he is avoiding or needs to decide]

Reply with your brain-dump and I will structure your day.`;

  try {
    const message = await askClaude(prompt);
    await pushMessage(message);
    return NextResponse.json({ status: 'morning briefing sent' });
  } catch (error) {
    console.error('Morning cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
