// Embeddings through the Vercel AI Gateway, authenticated with the project's
// gateway key if set, otherwise Vercel's per-request OIDC token.
// OpenAI embedding models are blocked on the free tier, so fall through.
const MODELS = ['openai/text-embedding-3-small', 'google/gemini-embedding-001', 'openai/text-embedding-3-large'];

export function gatewayToken(request: Request): string | undefined {
  return (
    import.meta.env.AI_GATEWAY_API_KEY ??
    process.env.AI_GATEWAY_API_KEY ??
    request.headers.get('x-vercel-oidc-token') ??
    process.env.VERCEL_OIDC_TOKEN ??
    undefined
  );
}

let workingModel: string | undefined;

export async function embed(request: Request, input: string[]): Promise<{ model: string; vectors: number[][]; usage: unknown }> {
  const token = gatewayToken(request);
  if (!token) throw new Error('Embedding service is not configured.');
  const order = workingModel ? [workingModel, ...MODELS.filter((m) => m !== workingModel)] : MODELS;
  const errors: string[] = [];
  for (const model of order) {
    const res = await fetch('https://ai-gateway.vercel.sh/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ model, input }),
    });
    const text = await res.text();
    if (res.ok) {
      try {
        const data = JSON.parse(text);
        workingModel = model;
        return { model: data.model ?? model, vectors: data.data.map((d: any) => d.embedding), usage: data.usage ?? {} };
      } catch {
        errors.push(`${model}: bad response`);
        continue;
      }
    }
    errors.push(`${model}: ${res.status} ${text.slice(0, 160)}`);
  }
  throw new Error(`Embedding failed. ${errors.join(' || ')}`);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
