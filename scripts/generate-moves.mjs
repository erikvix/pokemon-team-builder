/**
 * Gera `src/app/core/data/frlg-moves.ts` a partir da PokeAPI.
 *
 * Os ataques que cada um dos 151 aprende em FireRed/LeafGreen, mais os dados
 * de cada golpe (tipo, categoria, poder, precisão, PP) como eram *nesses
 * jogos*. Ao vivo seriam ~150 requisições por Pokémon aberto; gerado uma vez,
 * o modal de ataques abre na hora e funciona offline.
 *
 * Uso: node scripts/generate-moves.mjs
 */
import { writeFile } from 'node:fs/promises';

const API = 'https://pokeapi.co/api/v2';
const VERSION_GROUP = 'firered-leafgreen';
const LAST_GEN1_ID = 151;
const CONCURRENCY = 8;

/** Até a geração 3 a categoria vinha do tipo, não do golpe. */
const PHYSICAL_TYPES = new Set([
  'normal',
  'fighting',
  'flying',
  'poison',
  'ground',
  'rock',
  'bug',
  'ghost',
  'steel',
]);

const METHOD_KEY = {
  'level-up': 'levelUp',
  machine: 'machine',
  tutor: 'tutor',
  egg: 'egg',
};

async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url);
    if (response.ok) {
      return response.json();
    }
    if (attempt >= 4) {
      throw new Error(`PokeAPI ${response.status} em ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
}

async function mapWithConcurrency(items, worker, limit) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const versionGroupOrder = new Map();
async function orderOf(resource) {
  if (!versionGroupOrder.has(resource.name)) {
    const data = await getJson(resource.url);
    versionGroupOrder.set(resource.name, data.order);
  }
  return versionGroupOrder.get(resource.name);
}

async function fetchLearnset(id) {
  const data = await getJson(`${API}/pokemon/${id}`);
  const learnset = { levelUp: [], machine: [], tutor: [], egg: [] };
  for (const entry of data.moves) {
    for (const detail of entry.version_group_details) {
      if (detail.version_group.name !== VERSION_GROUP) continue;
      const key = METHOD_KEY[detail.move_learn_method.name];
      if (!key) continue;
      if (key === 'levelUp') {
        learnset.levelUp.push([detail.level_learned_at, entry.move.name]);
      } else if (!learnset[key].includes(entry.move.name)) {
        learnset[key].push(entry.move.name);
      }
    }
  }
  learnset.levelUp.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]));
  return { id, learnset };
}

/**
 * `past_values` guarda o valor que valia *antes* do version group indicado.
 * O que valia em FRLG é o do primeiro registro posterior a FRLG que tenha o
 * campo; sem registro, vale o atual.
 */
async function fetchMove(name) {
  const data = await getJson(`${API}/move/${name}`);
  const frlgOrder = await orderOf({
    name: VERSION_GROUP,
    url: `${API}/version-group/${VERSION_GROUP}`,
  });

  const later = [];
  for (const past of data.past_values) {
    const order = await orderOf(past.version_group);
    if (order > frlgOrder) later.push({ order, past });
  }
  later.sort((a, b) => a.order - b.order);
  const pick = (field, current) => {
    const hit = later.find(({ past }) => past[field] !== null && past[field] !== undefined);
    return hit ? hit.past[field] : current;
  };

  const type = pick('type', data.type)?.name ?? data.type.name;
  const isStatus = data.damage_class.name === 'status';
  const category = isStatus ? 'status' : PHYSICAL_TYPES.has(type) ? 'physical' : 'special';

  const flavor = data.flavor_text_entries.find(
    (item) => item.version_group.name === VERSION_GROUP && item.language.name === 'en',
  );

  let machine = null;
  const machineRef = data.machines.find((item) => item.version_group.name === VERSION_GROUP);
  if (machineRef) {
    const machineData = await getJson(machineRef.machine.url);
    machine = machineData.item.name.toUpperCase();
  }

  return {
    name,
    // Curse era do tipo "???" na geração 3 — sem equivalente entre os 18.
    type: type === 'unknown' ? null : type,
    category,
    // A PokeAPI guarda poder variável (Hidden Power) como 1.
    power: pick('power', data.power) === 1 ? null : pick('power', data.power),
    accuracy: pick('accuracy', data.accuracy),
    pp: pick('pp', data.pp),
    machine,
    description: flavor
      ? flavor.flavor_text
          .replace(/[\n\f\r­]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : null,
  };
}

const ids = Array.from({ length: LAST_GEN1_ID }, (_, i) => i + 1);
const learnsets = await mapWithConcurrency(ids, fetchLearnset, CONCURRENCY);
learnsets.sort((a, b) => a.id - b.id);

const moveNames = [
  ...new Set(
    learnsets.flatMap(({ learnset }) => [
      ...learnset.levelUp.map(([, move]) => move),
      ...learnset.machine,
      ...learnset.tutor,
      ...learnset.egg,
    ]),
  ),
].sort();
const moves = await mapWithConcurrency(moveNames, fetchMove, CONCURRENCY);

const str = (value) =>
  value === null ? 'null' : `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const list = (values) => `[${values.map(str).join(', ')}]`;

const moveRows = moves
  .map(
    (m) =>
      `  ${str(m.name)}: { type: ${str(m.type)}, category: '${m.category}', power: ${m.power}, ` +
      `accuracy: ${m.accuracy}, pp: ${m.pp}, machine: ${str(m.machine)}, description: ${str(m.description)} },`,
  )
  .join('\n');

const learnsetRows = learnsets
  .map(
    ({ id, learnset }) =>
      `  ${id}: {\n` +
      `    levelUp: [${learnset.levelUp.map(([level, move]) => `[${level}, ${str(move)}]`).join(', ')}],\n` +
      `    machine: ${list(learnset.machine)},\n` +
      `    tutor: ${list(learnset.tutor)},\n` +
      `    egg: ${list(learnset.egg)},\n` +
      `  },`,
  )
  .join('\n');

const file = `// ARQUIVO GERADO — não edite à mão.
// Rode \`node scripts/generate-moves.mjs\` para regerar a partir da PokeAPI.
import type { MoveCategory } from '../models/pokemon.model';
import type { PokemonType } from './pokemon-types';

/** Dados do golpe como eram em FireRed/LeafGreen. */
export interface FrlgMove {
  /** \`null\` é o tipo "???" (só Curse, na geração 3). */
  readonly type: PokemonType | null;
  /** Na geração 3 a categoria vem do tipo do golpe. */
  readonly category: MoveCategory;
  readonly power: number | null;
  readonly accuracy: number | null;
  readonly pp: number | null;
  /** \`TM24\`, \`HM03\` — quando o golpe é ensinado por máquina. */
  readonly machine: string | null;
  /** Texto do jogo (inglês — a PokeAPI não tem português). */
  readonly description: string | null;
}

export interface FrlgLearnset {
  /** \`[nível, golpe]\`, em ordem de nível. */
  readonly levelUp: ReadonlyArray<readonly [number, string]>;
  readonly machine: readonly string[];
  readonly tutor: readonly string[];
  readonly egg: readonly string[];
}

export const FRLG_MOVES: Readonly<Record<string, FrlgMove>> = {
${moveRows}
};

export const FRLG_LEARNSETS: Readonly<Record<number, FrlgLearnset>> = {
${learnsetRows}
};
`;

await writeFile(new URL('../src/app/core/data/frlg-moves.ts', import.meta.url), file, 'utf8');
console.log(`frlg-moves.ts gerado com ${moves.length} golpes e ${learnsets.length} learnsets.`);
