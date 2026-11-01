// Shared Claude call for the site's chat routes.
// Set ANTHROPIC_MODEL in Vercel to change the model without a code change.
export const DEFAULT_MODEL = 'claude-sonnet-5-5';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

function cleanHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

export async function handleChat(request: Request, system: string, maxTokens: number) {
  let message: unknown;
  let history: unknown;
  try {
    ({ message, history } = await request.json());
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  if (typeof message !== 'string' || !message.trim()) {
    return json({ error: 'Message required' }, 400);
  }

  const apiKey = import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'API key not configured', reason: 'missing_api_key' }, 500);
  }

  const model = import.meta.env.ANTHROPIC_MODEL ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;

  // The API needs the conversation to start with a user turn.
  const messages = [...cleanHistory(history), { role: 'user' as const, content: message.slice(0, 4000) }];
  while (messages.length && messages[0].role !== 'user') messages.shift();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
    });

    if (!response.ok) {
      const text = await response.text();
      let reason = `http_${response.status}`;
      try {
        reason = JSON.parse(text)?.error?.type ?? reason;
      } catch {
        // keep the status-based reason
      }
      console.error('Claude API error', response.status, model, text);
      return json({ error: 'Failed to get response', reason, model }, 502);
    }

    const data = await response.json();
    const reply = Array.isArray(data.content)
      ? data.content
          .filter((b: { type: string }) => b.type === 'text')
          .map((b: { text: string }) => b.text)
          .join('\n')
          .trim()
      : '';

    return json({ response: reply || 'Sorry, I could not generate a response.' });
  } catch (error) {
    console.error('Chat route error', error);
    return json({ error: 'Internal server error', reason: 'network_error' }, 500);
  }
}

// One-shot text call for server routes that need a plain answer.
export async function claudeText(opts: { system: string; prompt: string; model?: string; maxTokens?: number }): Promise<string> {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('API key not configured');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: opts.model ?? (import.meta.env.ANTHROPIC_MODEL ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL),
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(`Claude error ${res.status}: ${data?.error?.type ?? ''} ${data?.error?.message ?? ''}`.trim());
  return (data.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('').trim();
}

// Simple per-IP hourly limit for public routes.
const limitBuckets: Map<string, number[]> = ((globalThis as any).__pmoximLimits ??= new Map());
export function rateLimited(request: Request, key: string, perHour: number): boolean {
  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim();
  const id = `${key}:${ip}`;
  const now = Date.now();
  const recent = (limitBuckets.get(id) ?? []).filter((t) => t > now - 3600_000);
  if (recent.length >= perHour) return true;
  recent.push(now);
  limitBuckets.set(id, recent);
  return false;
}

// Structured output: offer a single tool and return its input object.
export async function claudeObject(opts: {
  system: string;
  prompt: string;
  toolName: string;
  description: string;
  schema: Record<string, unknown>;
  model?: string;
  maxTokens?: number;
}): Promise<any> {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('API key not configured');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: opts.model ?? (import.meta.env.ANTHROPIC_MODEL ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL),
      max_tokens: opts.maxTokens ?? 3000,
      system: opts.system,
      tools: [{ name: opts.toolName, description: opts.description, input_schema: opts.schema }],
      // Newer models reject forced tool_choice; with one tool and a clear
      // instruction they call it on their own.
      tool_choice: { type: 'auto' },
      messages: [{ role: 'user', content: opts.prompt }],
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(`Claude error ${res.status}: ${data?.error?.type ?? ''} ${data?.error?.message ?? ''}`.trim());
  const block = (data.content ?? []).find((b: any) => b.type === 'tool_use' && b.name === opts.toolName);
  if (!block) throw new Error(`No structured reply (stop: ${data.stop_reason})`);
  return block.input;
}
