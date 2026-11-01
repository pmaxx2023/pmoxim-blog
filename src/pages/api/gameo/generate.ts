import type { APIRoute } from 'astro';
import { claudeText, rateLimited } from '../../../lib/claude';

export const prerender = false;

const TOPOLOGIES = ['grid', 'concentric', 'track', 'pits', 'cruciform'] as const;
const CATEGORIES = ['race', 'war', 'position', 'mancala', 'dice', 'domino', 'card'] as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const SYSTEM = `You are Gameo, a board game designer grounded in R.C. Bell's "Board and Table Games from Many Civilizations".
Bell's families: race games, war games, positional games, mancala (sowing) games, dice games, domino games, card games.
Board topologies you may use: grid (chess, checkers, go), concentric (Nine Men's Morris), track (backgammon, pachisi, looped or linear paths), pits (mancala rows of cavities), cruciform (cross-shaped, like peg solitaire or pachisi arms).

Design ONE complete, playable, original game. Rules must be concrete enough to play tonight with simple components.
Return ONLY a JSON object, no prose, with exactly these keys:
{
  "name": string (2-4 words, original),
  "tagline": string (one sentence, under 16 words),
  "category": one of ${JSON.stringify(CATEGORIES)},
  "topology": one of ${JSON.stringify(TOPOLOGIES)},
  "board": { "size": integer, "notes": string } — size means: grid = squares per side (5-11); concentric = number of rings (2-4); track = number of spaces (16-60); pits = pits per row (4-8); cruciform = arm length in spaces (2-5),
  "players": string (e.g. "2" or "2-4"),
  "playTime": string (e.g. "20 minutes"),
  "complexity": integer 1-5,
  "components": string[] (3-7 items),
  "setup": string[] (2-6 steps),
  "turn": string[] (2-6 steps),
  "movement": string,
  "capture": string (or how interaction works if nothing is captured),
  "victory": string,
  "variants": string[] (1-3 short variants),
  "bellNote": string (one sentence naming the traditional game(s) this descends from)
}
Use plain words. Keep each string under 240 characters.`;

function extractJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON in reply');
  return JSON.parse(text.slice(start, end + 1));
}

function clean(game: any) {
  const str = (v: unknown, n = 240) => (typeof v === 'string' ? v.slice(0, n) : '');
  const list = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, max).map((x) => x.slice(0, 240)) : []);
  const topology = TOPOLOGIES.includes(game?.topology) ? game.topology : 'grid';
  const limits: Record<string, [number, number]> = { grid: [5, 11], concentric: [2, 4], track: [16, 60], pits: [4, 8], cruciform: [2, 5] };
  const [lo, hi] = limits[topology];
  const size = Math.min(hi, Math.max(lo, Math.round(Number(game?.board?.size) || lo)));
  return {
    name: str(game?.name, 60) || 'Untitled Game',
    tagline: str(game?.tagline, 160),
    category: CATEGORIES.includes(game?.category) ? game.category : 'position',
    topology,
    board: { size, notes: str(game?.board?.notes) },
    players: str(game?.players, 20) || '2',
    playTime: str(game?.playTime, 40),
    complexity: Math.min(5, Math.max(1, Math.round(Number(game?.complexity) || 2))),
    components: list(game?.components, 7),
    setup: list(game?.setup, 6),
    turn: list(game?.turn, 6),
    movement: str(game?.movement),
    capture: str(game?.capture),
    victory: str(game?.victory),
    variants: list(game?.variants, 3),
    bellNote: str(game?.bellNote),
  };
}

export const POST: APIRoute = async ({ request }) => {
  if (rateLimited(request, 'gameo-generate', 20)) return json({ error: 'You have made a lot of games this hour. Try again later.' }, 429);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const idea = typeof body?.idea === 'string' ? body.idea.trim().slice(0, 600) : '';
  if (idea.length < 3) return json({ error: 'Describe your game in a few words.' }, 400);
  const players = typeof body?.players === 'string' ? body.players.slice(0, 10) : '2';
  const complexity = Math.min(5, Math.max(1, Math.round(Number(body?.complexity) || 2)));
  const audience = Array.isArray(body?.audience) ? body.audience.filter((a: unknown) => typeof a === 'string').slice(0, 4).map((a: string) => a.slice(0, 120)) : [];

  const prompt = `Game idea: ${idea}
Players: ${players}
Target complexity: ${complexity} of 5
${audience.length ? `Designed for: ${audience.join('; ')}` : ''}`;

  try {
    let game;
    for (let attempt = 0; attempt < 2 && !game; attempt++) {
      const text = await claudeText({ system: SYSTEM, prompt, maxTokens: 1800 });
      try {
        game = clean(extractJson(text));
      } catch {
        // retry once on malformed JSON
      }
    }
    if (!game) return json({ error: 'The designer returned a broken game. Try again.' }, 502);
    return json({ game });
  } catch (error) {
    console.error('Gameo generate failed', error);
    return json({ error: 'Could not reach the game designer. Try again in a minute.' }, 502);
  }
};
