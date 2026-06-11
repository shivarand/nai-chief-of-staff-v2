const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
console.log('Supabase URL loaded:', !!process.env.SUPABASE_URL);
console.log('Supabase Key loaded:', !!process.env.SUPABASE_SERVICE_KEY);
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Save a conversation exchange
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

// Get recent conversations for context (last 15)
export async function getRecentConversations(limit: number = 15) {
  const { data, error } = await supabase
    .from('conversations')
    .select('user_message, assistant_reply, message_type, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) console.error('Get conversations error:', error);
  return (data || []).reverse();
}

// Get today's summary if it exists
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

// Update today's summary
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

// Get open tasks
export async function getOpenTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) console.error('Get tasks error:', error);
  return data || [];
}

// Save a task
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

// Build memory context string for Claude
export async function buildMemoryContext(): Promise<string> {
  const [recentConvos, todaySummary, openTasks] = await Promise.all([
    getRecentConversations(15),
    getTodaySummary(),
    getOpenTasks()
  ]);

  let context = '';

  if (todaySummary) {
    context += `TODAY'S SUMMARY SO FAR:\n${todaySummary.summary}\n\n`;
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
