type ChatMessage = { role: 'user' | 'assistant'; content: string };

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_CHARS = 12000;

const hits = new Map<string, number[]>();

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  const limited = recent.length >= RATE_LIMIT;
  if (!limited) recent.push(now);
  hits.set(ip, recent);
  return limited;
}

function cleanHistory(raw: unknown, message: string): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const history: ChatMessage[] = raw
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0,
    )
    .map((m) => ({ role: m.role, content: m.content }));

  const last = history[history.length - 1];
  if (last && last.role === 'user' && last.content === message) history.pop();

  let trimmed = history.slice(-MAX_HISTORY_MESSAGES);
  while (trimmed.length && trimmed[0].role !== 'user') trimmed = trimmed.slice(1);

  const merged: ChatMessage[] = [];
  for (const m of trimmed) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role) prev.content += '\n\n' + m.content;
    else merged.push({ ...m });
  }
  if (merged.length && merged[merged.length - 1].role === 'user') merged.pop();

  let total = 0;
  const kept: ChatMessage[] = [];
  for (let i = merged.length - 1; i >= 0; i--) {
    total += merged[i].content.length;
    if (total > MAX_HISTORY_CHARS) break;
    kept.unshift(merged[i]);
  }
  while (kept.length && kept[0].role !== 'user') kept.shift();
  return kept;
}

export async function guardChatRequest(
  request: Request,
  clientAddress: string,
): Promise<{ error: Response } | { messages: ChatMessage[] }> {
  if (!sameOrigin(request)) return { error: json({ error: 'Forbidden' }, 403) };
  if (rateLimited(clientAddress || 'unknown')) {
    return { error: json({ error: 'Too many messages. Try again later.' }, 429) };
  }

  let body: { message?: unknown; history?: unknown };
  try {
    body = await request.json();
  } catch {
    return { error: json({ error: 'Invalid request' }, 400) };
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return { error: json({ error: 'Message required' }, 400) };
  if (message.length > MAX_MESSAGE_CHARS) {
    return { error: json({ error: 'Message too long' }, 413) };
  }

  return { messages: [...cleanHistory(body.history, message), { role: 'user', content: message }] };
}
