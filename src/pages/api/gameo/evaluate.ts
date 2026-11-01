import type { APIRoute } from 'astro';
import { claudeText, rateLimited } from '../../../lib/claude';
import { cosine, embed } from '../../../lib/gateway-embed';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Same-sentence rating anchors: the rationale is scored by how close it
// sits to each statement, not by asking for a number.
const ANCHORS: Record<number, string> = {
  1: "I would never play this game. It is not for me at all.",
  2: "I probably wouldn't play this. It doesn't appeal to me much.",
  3: "I might play this once to see what it's like.",
  4: "I would probably play this and enjoy it.",
  5: "I would definitely play this again and again. I love it.",
};
const TEMPERATURE = 0.02;

function softmax(values: number[], temperature: number): number[] {
  const scaled = values.map((v) => v / temperature);
  const max = Math.max(...scaled);
  const exps = scaled.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export const POST: APIRoute = async ({ request }) => {
  if (rateLimited(request, 'gameo-evaluate', 30)) return json({ error: 'Too many evaluations this hour. Try again later.' }, 429);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const game = body?.game;
  const personas: string[] = Array.isArray(body?.personas)
    ? body.personas.filter((p: unknown) => typeof p === 'string' && p.trim()).slice(0, 5).map((p: string) => p.slice(0, 200))
    : [];
  if (!game?.name || personas.length === 0) return json({ error: 'Pick at least one player persona.' }, 400);

  const summary = [
    `${game.name}: ${game.tagline ?? ''}`,
    `Players ${game.players}, about ${game.playTime}, complexity ${game.complexity}/5, ${game.topology} board.`,
    `Turn: ${(game.turn ?? []).join(' ')}`,
    `Movement: ${game.movement ?? ''}`,
    `Capture: ${game.capture ?? ''}`,
    `Win: ${game.victory ?? ''}`,
  ].join('\n').slice(0, 2500);

  try {
    const results = await Promise.all(
      personas.map(async (persona) => {
        const rationale = await claudeText({
          model: 'claude-haiku-5-5',
          maxTokens: 120,
          system:
            'You are a real person reacting to a board game pitch. Stay in character. Write 30-40 words in first person about whether you would play it and why. Be concrete: rules, length, theme, who you would play with. Never give a number, rating or score.',
          prompt: `You are: ${persona}\n\nThe game:\n${summary}`,
        });
        return { persona, rationale };
      }),
    );

    const anchorKeys = Object.keys(ANCHORS).map(Number).sort((a, b) => a - b);
    const { vectors } = await embed(request, [...anchorKeys.map((k) => ANCHORS[k]), ...results.map((r) => r.rationale)]);
    const anchorVecs = vectors.slice(0, anchorKeys.length);

    const scored = results.map((r, i) => {
      const v = vectors[anchorKeys.length + i];
      const sims = anchorVecs.map((a) => cosine(v, a));
      const probs = softmax(sims, TEMPERATURE);
      const distribution: Record<number, number> = {};
      anchorKeys.forEach((k, j) => (distribution[k] = probs[j]));
      const expected = anchorKeys.reduce((sum, k, j) => sum + k * probs[j], 0);
      return { ...r, distribution, expected };
    });

    const average = scored.reduce((s, r) => s + r.expected, 0) / scored.length;
    return json({ results: scored, average });
  } catch (error) {
    console.error('Gameo evaluate failed', error);
    return json({ error: 'Could not run the evaluation. Try again in a minute.', detail: String((error as Error).message || error).slice(0, 200) }, 502);
  }
};
