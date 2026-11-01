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
