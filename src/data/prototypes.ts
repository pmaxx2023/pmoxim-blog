export type Status = 'Live' | 'Code' | 'Private build' | 'Offline';

export interface Prototype {
  title: string;
  description: string;
  tags: string[];
  status: Status;
  href?: string;
  featured?: boolean;
}

export interface PrototypeGroup {
  id: string;
  name: string;
  blurb: string;
  items: Prototype[];
}

export const groups: PrototypeGroup[] = [
  {
    id: 'healthcare',
    name: 'Healthcare and pharmacy',
    blurb: 'Tools for the parts of healthcare most people never see: data standards, claims and drug supply.',
    items: [
      {
        title: 'Clario',
        description: 'Describe a FHIR concept in plain words and get a clean technical diagram back in seconds.',
        tags: ['FHIR', 'AI', 'Diagrams'],
        status: 'Live',
        href: 'https://getclario.net',
        featured: true,
      },
      {
        title: 'FHIR Flipbook',
        description: 'A visual guide to FHIR, the data standard behind modern health APIs.',
        tags: ['FHIR', 'Education'],
        status: 'Live',
        href: 'https://fhir-flipbook.com',
      },
      {
        title: 'PharmIntel',
        description: 'A drug distribution news and intelligence dashboard. It tracks 12 topics and refreshes every four hours.',
        tags: ['Pharmacy', 'React', 'Claude API'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/pharmintel',
      },
      {
        title: 'Pharmacy EDI Hub',
        description: 'A map of the EDI messages that move between pharmacies and their trading partners, plus who sends each one.',
        tags: ['Pharmacy', 'EDI'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/Pharmacy_Workflow',
      },
    ],
  },
  {
    id: 'product',
    name: 'Product strategy tools',
    blurb: 'Ways to find, size and test product ideas before anyone writes a spec.',
    items: [
      {
        title: 'Synthetic Customer Intent',
        description: 'Ask synthetic buyers why they would or would not purchase. Score their answers and see the spread on a Likert chart.',
        tags: ['Research', 'Embeddings'],
        status: 'Live',
        href: 'https://syntheticcustomerintent.com',
        featured: true,
      },
      {
        title: 'VantagePlan',
        description: 'A SAFe PI planning board. Drag work into sprints, see dependencies and check team capacity.',
        tags: ['SAFe', 'React', 'TypeScript'],
        status: 'Live',
        href: 'https://vantageplan.net',
      },
      {
        title: 'PMF System',
        description: 'A system to forecast and measure product-market fit. It treats fit as a state a product can enter and leave.',
        tags: ['Research', 'Statistics'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/PMF_Package',
      },
      {
        title: 'Torn Report',
        description: 'Finds where a product category fails its users. A tear must be real, widespread and unsolved. Tested across 11 categories.',
        tags: ['Research', 'AI agents'],
        status: 'Private build',
      },
      {
        title: 'CUROS',
        description: 'Finds a fix that worked in one field and moves it to another. Built on a catalog of 61 grounded findings.',
        tags: ['Strategy', 'AI'],
        status: 'Private build',
      },
      {
        title: 'Ralph Multiplayer',
        description: 'A shared product spec editor. Several people edit at once while AI agents work the stories and post progress.',
        tags: ['Yjs', 'Hono', 'Agents'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/ralph-multiplayer',
      },
    ],
  },
  {
    id: 'ai',
    name: 'AI tools and agents',
    blurb: 'Agents, skills and generators. Most started as a weekend test of one idea.',
    items: [
      {
        title: 'Ask Me Anything',
        description: 'An AI version of me, trained on my resume and how I think about product. Ask it anything.',
        tags: ['Claude API', 'Astro'],
        status: 'Live',
        href: '/ask',
        featured: true,
      },
      {
        title: 'Mental Models Coach',
        description: 'A thinking coach with 122 mental models. Bring a decision and it applies the right lenses.',
        tags: ['Claude API', 'Decisions'],
        status: 'Live',
        href: '/models',
      },
      {
        title: 'Archi',
        description: 'Turns a product description into a hand-drawn architecture diagram.',
        tags: ['Gemini', 'Diagrams'],
        status: 'Live',
        href: '/projects/archi',
      },
      {
        title: 'Gameo',
        description: 'Generates new board games from a classic taxonomy of game mechanics. The live demo is offline.',
        tags: ['AI', 'Games'],
        status: 'Offline',
        href: '/projects/gameo',
      },
      {
        title: 'handoff-kit',
        description: 'Lets one AI agent pass work to another without redoing it. Each handoff carries evidence and a sha256 receipt.',
        tags: ['MCP', 'Python', 'Agents'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/handoff-kit',
      },
      {
        title: 'HR-AI',
        description: 'A workforce simulator for AI agents. Supervisor agents keep append-only employment records.',
        tags: ['Agents', 'Governance'],
        status: 'Private build',
      },
      {
        title: 'SaaSVillage',
        description: 'A team of AI agents that hunts and scores software ideas. Eight hunters feed an auditor with a fixed scoring formula.',
        tags: ['Agents', 'Scoring'],
        status: 'Private build',
      },
      {
        title: 'FigOne',
        description: 'An editorial diagram renderer. It has a 50-glyph pictogram library and lint-checked SVG and PNG output.',
        tags: ['Diagrams', 'Claude skill'],
        status: 'Private build',
      },
      {
        title: 'Author',
        description: 'A writing skill that blocks AI filler. It checks reading level and 30+ banned words before text ships.',
        tags: ['Writing', 'Claude skill'],
        status: 'Private build',
      },
      {
        title: 'Vox',
        description: 'A personal AI setup with 79 skills, built on the open source PAI project.',
        tags: ['Claude Code', 'Skills'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/Personal_AI_Infrastructure',
      },
      {
        title: 'Prior Art Machine',
        description: 'A database of 3,746 inventions from science fiction, searchable as prior art.',
        tags: ['Data', 'Research'],
        status: 'Private build',
      },
    ],
  },
  {
    id: 'home',
    name: 'Home and everyday',
    blurb: 'Things built for my own house first.',
    items: [
      {
        title: 'PantryShop Home',
        description: 'One grocery list for the whole house, on the phone and on the kitchen wall. Items sort by aisle in store order.',
        tags: ['Cloudflare', 'PWA'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/home_pantryshop',
        featured: true,
      },
      {
        title: 'PShop Meal Planner',
        description: 'A meal planner with a Today’s Specials menu. It reads your pantry from photos, right in the browser.',
        tags: ['Meal planning', 'On-device AI'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/PantryShop',
      },
      {
        title: 'Anyframe',
        description: 'Turns a photo frame you already own into a home dashboard. Waitlist open.',
        tags: ['Hardware', 'Dashboard'],
        status: 'Private build',
      },
      {
        title: 'MOXBOX',
        description: 'A cabinet design app for my own shop. Shelves and boxes are edited right on the 3D model.',
        tags: ['3D', 'Woodworking'],
        status: 'Private build',
      },
      {
        title: 'vigilant_turtle',
        description: 'A command line tool that finds eBay listings priced well below the median for resale.',
        tags: ['Python', 'eBay API'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/vigilant_turtle',
      },
    ],
  },
  {
    id: 'stores',
    name: 'Stores and media',
    blurb: 'Small live businesses. Each one tests a way to find buyers.',
    items: [
      {
        title: 'TradeAI Tools',
        description: 'A directory of AI tools for contractors and the trades, with real pricing.',
        tags: ['Directory', 'SEO'],
        status: 'Live',
        href: 'https://pmaxx2023.github.io/ai-for-trades/',
        featured: true,
      },
      {
        title: 'Porch Press',
        description: 'Printable historical mystery games you solve at home. Instant PDF download.',
        tags: ['Games', 'E-commerce'],
        status: 'Live',
        href: 'https://pmaxx2023.github.io/porch-press/',
        featured: true,
      },
      {
        title: 'Phogold Ink Trace',
        description: 'Turns a photo into ink art in the browser. The store and paid versions are built but not launched yet.',
        tags: ['Image tools', 'E-commerce'],
        status: 'Code',
        href: 'https://github.com/pmaxx2023/Move37',
      },
      {
        title: 'Scribbleton',
        description: 'A world of interactive night scenes. The city and the country are built so far.',
        tags: ['Interactive', 'Art'],
        status: 'Private build',
      },
    ],
  },
];

export const allPrototypes = groups.flatMap((g) => g.items);
export const featured = allPrototypes.filter((p) => p.featured);
