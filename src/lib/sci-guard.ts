// Guards for the Synthetic Customer Intent endpoints.
// They speak the OpenAI wire format so the Replit app can use them as its
// OpenAI base URL, but only for the two calls that app makes.

export const SCI_CLIENT_HEADER = 'x-sci-client';
export const SCI_CLIENT_VALUE = 'syntheticcustomerintent';
const LIMIT_PER_HOUR = 600;

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const openAiError = (message: string, status: number, type = 'invalid_request_error') =>
  json({ error: { message, type } }, status);

const hits: number[] = ((globalThis as any).__sciHits ??= []);

export function checkGuard(request: Request): Response | null {
  if (request.headers.get(SCI_CLIENT_HEADER) !== SCI_CLIENT_VALUE) {
    return openAiError('Not allowed.', 403, 'permission_error');
  }
  const now = Date.now();
  while (hits.length && hits[0] < now - 3600_000) hits.shift();
  if (hits.length >= LIMIT_PER_HOUR) {
    return openAiError('Rate limit reached. Try again later.', 429, 'rate_limit_error');
  }
  hits.push(now);
  return null;
}
