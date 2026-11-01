import type { APIRoute } from 'astro';
import { checkGuard, json, openAiError } from '../../../../lib/sci-guard';
import { embed } from '../../../../lib/gateway-embed';

export const prerender = false;

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

  try {
    const { model, vectors, usage } = await embed(request, input);
    return json({
      object: 'list',
      data: vectors.map((embedding, index) => ({ object: 'embedding', index, embedding })),
      model,
      usage,
    });
  } catch (error) {
    console.error('SCI embeddings failed', error);
    return openAiError(String((error as Error).message).slice(0, 300), 502, 'server_error');
  }
};
