import { NextRequest, NextResponse } from 'next/server';
import { pushMessage } from '@/lib/line';
import { askClaude } from '@/lib/claude';
import { getOpenTasks, getRecentConversations } from '@/lib/memory';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const openTasks = await getOpenTasks();
  const recentConvos = await getRecentConversations(30);

  const taskCount = openTasks.length;
  const byBiz: Record<string, number> = {};
  openTasks.forEach((t: any) => {
    byBiz[t.business] = (byBiz[t.business] || 0) + 1;
  });

  const prompt = `CRITICAL SUMMARY RULES:
- Never alter or invent people's names, dates, financial figures, or who-is-traveling.
- If a detail is unclear, OMIT it rather than guessing.
- Preserve the two-part loan status exactly (15M refinance submitted; equipment not yet filed).
- Do not introduce any name not explicitly stated by Nai.

Generate Nai's Sunday weekly review.

Open tasks: ${taskCount} total
By business: ${JSON.stringify(byBiz)}
Conversations this week: ${recentConvos.length}

Format:
Weekly review 📊

━━━━━━━━━━
PHOENIX PROTOCOL STATUS
━━━━━━━━━━
[Honest 2-sentence assessment — are we moving fast enough on the turnaround?]

━━━━━━━━━━
PATTERNS THIS WEEK
━━━━━━━━━━
[What kept appearing? What was avoided? Be specific.]

━━━━━━━━━━
NEXT WEEK'S ONE BIG THING
━━━━━━━━━━
Factory: [one outcome]
MuCat: [one outcome]
Stone sinks: [one outcome]

━━━━━━━━━━
THE HONEST QUESTION
━━━━━━━━━━
[One uncomfortable truth Nai needs to face going into next week]`;

  try {
    const message = await askClaude(prompt);
    await pushMessage(message);
    return NextResponse.json({ status: 'weekly review sent' });
  } catch (error) {
    console.error('Weekly cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
