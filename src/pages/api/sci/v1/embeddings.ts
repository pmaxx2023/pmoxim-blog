import type { APIRoute } from 'astro';
import { checkGuard, gatewayToken, json, openAiError } from '../../../../lib/sci-guard';

export const prerender = false;

// Gateway embedding models to try, in order.
const MODELS = ['openai/text-embedding-3-small', 'openai/text-embedding-3-large', 'google/gemini-embedding-001'];

export const POST: APIRoute = async ({ request }) => {
  const blocked = checkGuard(request);
  if (blocked) return blocked;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return openAiError('Invalid JSON.', 400);
  }

  const input: string[] = typeof body?.input === 'string' ? [body.input] : body?.input;
  if (!Array.isArray(input) || input.length === 0 || input.length > 20 || input.some((t) => typeof t !== 'string' || t.length > 4000)) {
    return openAiError('input must be 1-20 strings of up to 4000 characters.', 400);
  }

  const token = gatewayToken(request);
  if (!token) return openAiError('Embedding service is not configured.', 500, 'server_error');

  let lastError = '';
  for (const model of MODELS) {
    const res = await fetch('https://ai-gateway.vercel.sh/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ model, input }),
    });
    const text = await res.text();
    if (res.ok) {
      try {
        const data = JSON.parse(text);
        return json({ object: 'list', data: data.data, model: data.model ?? model, usage: data.usage ?? {} });
      } catch {
        lastError = 'Bad embedding response.';
        continue;
      }
    }
    lastError = `${model}: ${res.status} ${text.slice(0, 200)}`;
    console.error('SCI embeddings failed', lastError);
  }
  return openAiError(`Embedding failed. ${lastError}`, 502, 'server_error');
};
