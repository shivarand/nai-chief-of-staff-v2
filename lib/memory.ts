import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function saveConversation(
  userMessage: string,
  assistantReply: string,
  messageType: string = 'text',
  businessContext: string = 'mixed'
) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_message: userMessage,
      assistant_reply: assistantReply,
      message_type: messageType,
      business_context: businessContext
    })
    .select()
    .single();
  if (error) console.error('Save conversation error:', error);
  return data;
}

export async function getRecentConversations(limit: number = 30) {
  const { data, error } = await supabase
    .from('conversations')
    .select('user_message, assistant_reply, message_type, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('Get conversations error:', error);
  return (data || []).reverse();
}

export async function getTodaySummary() {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('summary_date', today)
    .single();
  if (error && error.code !== 'PGRST116') console.error('Get summary error:', error);
  return data;
}

export async function updateTodaySummary(
  summary: string,
  openTasks: string[] = [],
  keyDecisions: string[] = [],
  energyLevel?: number
) {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('daily_summaries')
    .upsert({
      summary_date: today,
      summary,
      open_tasks: openTasks,
      key_decisions: keyDecisions,
      energy_level: energyLevel,
      updated_at: new Date().toISOString()
    });
  if (error) console.error('Update summary error:', error);
}

export async function getOpenTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (error) console.error('Get tasks error:', error);
  return data || [];
}

export async function saveTask(
  task: string,
  business: string,
  priority: string = 'thisweek',
  sourceConversationId?: string
) {
  const { error } = await supabase
    .from('tasks')
    .insert({
      task,
      business,
      priority,
      source_conversation: sourceConversationId
    });
  if (error) console.error('Save task error:', error);
}

export async function saveFactOverride(fact: string) {
  const { error } = await supabase
    .from('fact_overrides')
    .insert({ fact });
  if (error) console.error('Save fact override error:', error);
}

export async function getFactOverrides(): Promise<string> {
  const { data, error } = await supabase
    .from('fact_overrides')
    .select('fact, created_at')
    .order('created_at', { ascending: true });
  if (error) { console.error('Get fact overrides error:', error); return ''; }
  if (!data || data.length === 0) return '';
  return data.map((f: any) => `- ${f.fact}`).join('\n');
}

export async function getOpenLoops() {
  const { data, error } = await supabase
    .from('open_loops')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: true });
  if (error) console.error('Get open loops error:', error);
  return data || [];
}

export async function addOpenLoop(question: string) {
  const existing = await getOpenLoops();
  if (existing.some((l: any) => l.question.toLowerCase().includes(question.toLowerCase().slice(0, 20)))) return;
  const { error } = await supabase.from('open_loops').insert({ question });
  if (error) console.error('Add open loop error:', error);
}

export async function resolveOpenLoop(id: string) {
  const { error } = await supabase
    .from('open_loops')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('Resolve open loop error:', error);
}

export async function buildMemoryContext(): Promise<string> {
  const [recentConvos, todaySummary, openTasks, openLoops] = await Promise.all([
    getRecentConversations(30),
    getTodaySummary(),
    getOpenTasks(),
    getOpenLoops()
  ]);

  let context = '';

  if (todaySummary) {
    context += `TODAY'S SUMMARY SO FAR:\n${todaySummary.summary}\n\n`;
  }

  if (openLoops.length > 0) {
    context += 'UNANSWERED QUESTIONS (you already asked these — do not re-ask blindly; either chase once or move on):\n';
    openLoops.forEach((l: any) => { context += `- ${l.question}\n`; });
    context += '\n';
  }

  if (openTasks.length > 0) {
    const tasksByBiz: Record<string, string[]> = {};
    openTasks.forEach((t: any) => {
      if (!tasksByBiz[t.business]) tasksByBiz[t.business] = [];
      tasksByBiz[t.business].push(`[${t.priority}] ${t.task}`);
    });
    context += 'OPEN TASKS:\n';
    Object.entries(tasksByBiz).forEach(([biz, tasks]) => {
      context += `${biz.toUpperCase()}: ${tasks.join(' | ')}\n`;
    });
    context += '\n';
  }

  if (recentConvos.length > 0) {
    context += 'RECENT CONVERSATION HISTORY:\n';
    recentConvos.forEach((c: any) => {
      const time = new Date(c.created_at).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
      context += `[${time}]\nNai: ${c.user_message}\nYou: ${c.assistant_reply}\n\n`;
    });
  }

  return context;
}

export async function saveTranscriptionJob(transcriptId: string, lineUserId: string) {
  const { error } = await supabase
    .from('transcription_jobs')
    .insert({ transcript_id: transcriptId, line_user_id: lineUserId });
  if (error) console.error('Save transcription job error:', error);
}

export async function getTranscriptionJob(transcriptId: string) {
  const { data, error } = await supabase
    .from('transcription_jobs')
    .select('*')
    .eq('transcript_id', transcriptId)
    .single();
  if (error) console.error('Get transcription job error:', error);
  return data;
}

export async function completeTranscriptionJob(transcriptId: string) {
  const { error } = await supabase
    .from('transcription_jobs')
    .update({ status: 'completed' })
    .eq('transcript_id', transcriptId);
  if (error) console.error('Complete transcription job error:', error);
}
