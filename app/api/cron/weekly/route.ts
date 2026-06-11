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

  const prompt = `Generate Nai's Sunday weekly review.\n\nOpen tasks: ${taskCount} total\nBy business: ${JSON.stringify(byBiz)}\nConversations this week: ${recentConvos.length}\n\nFormat:\nWeekly review 📊\n\n━━━━━━━━━━\nPHOENIX PROTOCOL STATUS\n━━━━━━━━━━\n[Honest 2-sentence assessment — are we moving fast enough on the turnaround?]\n\n━━━━━━━━━━\nPATTERNS THIS WEEK\n━━━━━━━━━━\n[What kept appearing? What was avoided? Be specific.]\n\n━━━━━━━━━━\nNEXT WEEK'S ONE BIG THING\n━━━━━━━━━━\nFactory: [one outcome]\nMuCat: [one outcome]\nStone sinks: [one outcome]\n\n━━━━━━━━━━\nTHE HONEST QUESTION\n━━━━━━━━━━\n[One uncomfortable truth Nai needs to face going into next week]`;

  try {
    const message = await askClaude(prompt);
    await pushMessage(message);
    return NextResponse.json({ status: 'weekly review sent' });
  } catch (error) {
    console.error('Weekly cron error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
