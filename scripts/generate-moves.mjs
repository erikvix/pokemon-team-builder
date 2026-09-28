/**
 * Gera `src/app/core/data/<jogo>-moves.ts` a partir da PokeAPI.
 *
 * Os ataques que cada Pokémon do jogo aprende, mais os dados de cada golpe
 * (tipo, categoria, poder, precisão, PP) como eram *naquele jogo*. Ao vivo
 * seriam ~150 requisições por Pokémon aberto; gerado uma vez, o modal de
 * ataques abre na hora e funciona offline.
 *
 * Uso: node scripts/generate-moves.mjs <frlg|hgss>
 * (hgss precisa do `hgss-available.ts`, escrito pelo generate-encounters.)
 */
import { writeFile } from 'node:fs/promises';
import { API, gameFromArgs, getJson, idsFor, mapWithConcurrency, str } from './lib.mjs';

const game = gameFromArgs();

/** Até a geração 3 a categoria vinha do tipo; da 4 em diante, do golpe. */
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
      if (detail.version_group.name !== game.versionGroup) continue;
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
 * O que valia no jogo é o do primeiro registro posterior a ele que tenha o
 * campo; sem registro, vale o atual.
 */
async function fetchMove(name) {
  const data = await getJson(`${API}/move/${name}`);
  const gameOrder = await orderOf({
    name: game.versionGroup,
    url: `${API}/version-group/${game.versionGroup}`,
  });

  const later = [];
  for (const past of data.past_values) {
    const order = await orderOf(past.version_group);
    if (order > gameOrder) later.push({ order, past });
  }
  later.sort((a, b) => a.order - b.order);
  const pick = (field, current) => {
    const hit = later.find(({ past }) => past[field] !== null && past[field] !== undefined);
    return hit ? hit.past[field] : current;
  };

  const type = pick('type', data.type)?.name ?? data.type.name;
  const isStatus = data.damage_class.name === 'status';
  const category = isStatus
    ? 'status'
    : game.generation >= 4
      ? data.damage_class.name
      : PHYSICAL_TYPES.has(type)
        ? 'physical'
        : 'special';

  const flavor = data.flavor_text_entries.find(
    (item) => item.version_group.name === game.versionGroup && item.language.name === 'en',
  );

  let machine = null;
  const machineRef = data.machines.find((item) => item.version_group.name === game.versionGroup);
  if (machineRef) {
    const machineData = await getJson(machineRef.machine.url);
    machine = machineData.item.name.toUpperCase();
  }

  const power = pick('power', data.power);
  return {
    name,
    // Curse era do tipo "???" até a geração 4 — sem equivalente entre os 18.
    type: type === 'unknown' ? null : type,
    category,
    // A PokeAPI guarda poder variável (Hidden Power) como 1.
    power: power === 1 ? null : power,
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

const ids = await idsFor(game);
const learnsets = await mapWithConcurrency(ids, fetchLearnset);
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
const moves = await mapWithConcurrency(moveNames, fetchMove);

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

const fileName = `${game.key}-moves.ts`;
const file = `// ARQUIVO GERADO — não edite à mão.
// Rode \`node scripts/generate-moves.mjs ${game.key}\` para regerar a partir da PokeAPI.
import type { GameLearnset, GameMove } from './game-data.model';

export const MOVES: Readonly<Record<string, GameMove>> = {
${moveRows}
};

export const LEARNSETS: Readonly<Record<number, GameLearnset>> = {
${learnsetRows}
};
`;

await writeFile(new URL(`../src/app/core/data/${fileName}`, import.meta.url), file, 'utf8');
console.log(`${fileName} gerado com ${moves.length} golpes e ${learnsets.length} learnsets.`);
