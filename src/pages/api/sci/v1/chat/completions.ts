import type { APIRoute } from 'astro';
import { checkGuard, json, openAiError } from '../../../../../lib/sci-guard';

export const prerender = false;

const MODEL = 'claude-haiku-5-5';

export const POST: APIRoute = async ({ request }) => {
  const blocked = checkGuard(request);
  if (blocked) return blocked;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return openAiError('Invalid JSON.', 400);
  }

  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const text = (c: unknown) => (typeof c === 'string' ? c : '');
  const system = messages.filter((m: any) => m?.role === 'system').map((m: any) => text(m.content)).join('\n\n');
  const turns = messages
    .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && text(m.content))
    .map((m: any) => ({ role: m.role, content: text(m.content) }));

  const totalChars = system.length + turns.reduce((n: number, m: any) => n + m.content.length, 0);
  if (!turns.length || turns[0].role !== 'user' || totalChars > 12000 || turns.length > 6) {
    return openAiError('Unsupported message list.', 400);
  }

  const apiKey = import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return openAiError('Model service is not configured.', 500, 'server_error');

  const maxTokens = Math.min(Math.max(Number(body?.max_tokens) || 150, 16), 300);
  const temperature = typeof body?.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1) : 0.7;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, temperature, system: system || undefined, messages: turns }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    console.error('SCI chat failed', res.status, JSON.stringify(data)?.slice(0, 300));
    return openAiError(`Completion failed: ${data?.error?.type ?? res.status} ${String(data?.error?.message ?? '').slice(0, 160)}`, 502, 'server_error');
  }

  const content = (data.content ?? [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('')
    .trim();

  return json({
    id: `chatcmpl-${data.id ?? Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: MODEL,
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: {
      prompt_tokens: data.usage?.input_tokens ?? 0,
      completion_tokens: data.usage?.output_tokens ?? 0,
      total_tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
    },
  });
};
