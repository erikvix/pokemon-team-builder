/**
 * Gera `src/app/core/data/<jogo>-encounters.ts` a partir da PokeAPI.
 *
 * Onde cada Pokémon aparece no jogo: área, forma de encontro (grama, vara,
 * surf, Headbutt, presente…), faixa de nível, chance, versão e condições
 * (horário do dia, rádio, swarm…). Ao vivo seriam uma requisição por Pokémon
 * mais uma por área para traduzir o nome; gerado uma vez, o modal abre na hora.
 *
 * Também escreve `<jogo>-available.ts`: os Pokémon do jogo na ordem da
 * história (`scripts/progression.mjs`). Para jogos com `ids: 'available'`
 * (HGSS, RSE) a lista é de quem aparece no jogo, mais quem se consegue a partir
 * deles evoluindo ou reproduzindo.
 *
 * Uso: node scripts/generate-encounters.mjs <frlg|hgss|rse>
 */
import { writeFile } from 'node:fs/promises';
import {
  API,
  LAST_NATIONAL_ID,
  gameFromArgs,
  getJson,
  idFromUrl,
  mapWithConcurrency,
  range,
  str,
} from './lib.mjs';
import { PROGRESSION } from './progression.mjs';

const game = gameFromArgs();
const progression = PROGRESSION[game.key];
const VERSIONS = new Set(game.versions);
/** Último id que o jogo pode ter (RSE vai até #386). */
const LAST_ID = game.lastId ?? LAST_NATIONAL_ID;
/** Áreas que só se acessam com ingresso de evento (Southern Island, Navel Rock…). */
const EVENT_AREAS = new Set(game.eventAreas ?? []);
const unknownAreas = new Set();

/**
 * Formas de encontro que existem nos jogos. Ficam de fora as de eventos e
 * discos bônus (Colosseum, Pokémon Channel…), que a PokeAPI mistura.
 */
const METHODS = new Set([
  'walk',
  'old-rod',
  'good-rod',
  'super-rod',
  'surf',
  'rock-smash',
  'headbutt',
  'squirt-bottle',
  'gift',
  'gift-egg',
  'static',
  'pokeflute',
  'npc-trade',
  'roaming-grass',
  'roaming-water',
  'seaweed',
  'feebas-tile-fishing',
  'devon-scope',
  'wailmer-pail',
]);

/** Condições que mudam onde/quando aparece. Estados "desligados" ficam de fora. */
function conditionOf(name) {
  if (name.startsWith('johto-safari-blocks-') && name !== 'johto-safari-blocks-inactive') {
    return 'safari-blocks';
  }
  return (
    {
      'time-morning': 'morning',
      'time-day': 'day',
      'time-night': 'night',
      'swarm-yes': 'swarm',
      'radio-hoenn': 'radio-hoenn',
      'radio-sinnoh': 'radio-sinnoh',
      'bug-catching-contest-yes': 'bug-contest',
      'headbutt-tree-common': 'headbutt-common',
      'headbutt-tree-rare': 'headbutt-rare',
    }[name] ?? null
  );
}

const CONDITION_ORDER = [
  'morning',
  'day',
  'night',
  'swarm',
  'radio-hoenn',
  'radio-sinnoh',
  'bug-contest',
  'safari-blocks',
  'headbutt-common',
  'headbutt-rare',
];
const TIMES = ['morning', 'day', 'night'];

/** Ordem na ficha: encontros comuns primeiro, especiais e presentes no fim. */
const METHOD_ORDER = [
  'walk',
  'surf',
  'old-rod',
  'good-rod',
  'super-rod',
  'seaweed',
  'feebas-tile-fishing',
  'rock-smash',
  'headbutt',
  'roaming-grass',
  'roaming-water',
  'squirt-bottle',
  'wailmer-pail',
  'devon-scope',
  'pokeflute',
  'static',
  'gift',
  'gift-egg',
  'npc-trade',
];

const areaNames = new Map();
async function areaName(resource) {
  if (!areaNames.has(resource.name)) {
    const data = await getJson(resource.url);
    const english = data.names.find((item) => item.language.name === 'en')?.name;
    // A PokeAPI chama algumas rotas de "Road"; nos jogos é "Route".
    areaNames.set(
      resource.name,
      (english ?? readableSlug(resource.name)).replace(/^Road (\d)/, 'Route $1'),
    );
  }
  return areaNames.get(resource.name);
}

/** `team-aqua-hideout-area` → `Team Aqua Hideout`; `shoal-cave-b2f` → `Shoal Cave B2F`. */
function readableSlug(slug) {
  return slug
    .replace(/-area$/, '')
    .split('-')
    .map((word) =>
      /^b?\d+f$/.test(word) ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1),
    )
    .join(' ');
}

const skipped = new Set();

async function fetchEncounters(id) {
  const data = await getJson(`${API}/pokemon/${id}/encounters`);
  /** área|método|condições → linha, juntando as duas versões. */
  const merged = new Map();
  for (const area of data) {
    if (EVENT_AREAS.has(area.location_area.name)) continue;
    for (const version of area.version_details) {
      if (!VERSIONS.has(version.version.name)) continue;
      const bySlot = new Map();
      for (const detail of version.encounter_details) {
        const method = detail.method.name;
        if (!METHODS.has(method)) {
          skipped.add(method);
          continue;
        }
        const conditions = [
          ...new Set(detail.condition_values.map((c) => conditionOf(c.name)).filter(Boolean)),
        ].sort((a, b) => CONDITION_ORDER.indexOf(a) - CONDITION_ORDER.indexOf(b));
        const key = `${method}|${conditions.join(',')}`;
        const current = bySlot.get(key) ?? {
          method,
          conditions,
          min: Infinity,
          max: 0,
          chance: 0,
        };
        current.min = Math.min(current.min, detail.min_level);
        current.max = Math.max(current.max, detail.max_level);
        current.chance += detail.chance;
        bySlot.set(key, current);
      }
      for (const [slotKey, slot] of bySlot) {
        const key = `${area.location_area.name}|${slotKey}`;
        const row = merged.get(key) ?? {
          area: await areaName(area.location_area),
          method: slot.method,
          conditions: slot.conditions,
          minLevel: slot.min,
          maxLevel: slot.max,
          chance: 0,
          versions: new Set(),
        };
        row.minLevel = Math.min(row.minLevel, slot.min);
        row.maxLevel = Math.max(row.maxLevel, slot.max);
        row.chance = Math.max(row.chance, Math.min(100, slot.chance));
        row.versions.add(version.version.name);
        merged.set(key, row);
      }
    }
  }
  return { id, rows: collapseTimes([...merged.values()]) };
}

/**
 * Linhas iguais que só diferem no horário viram uma ("Manhã · Dia"); se
 * cobrirem os três horários, o horário some.
 */
function collapseTimes(rows) {
  const groups = new Map();
  for (const row of rows) {
    const others = row.conditions.filter((c) => !TIMES.includes(c));
    const versions = [...row.versions].sort().join(',');
    const key = [
      row.area,
      row.method,
      others.join(','),
      row.minLevel,
      row.maxLevel,
      row.chance,
      versions,
    ].join('|');
    const group = groups.get(key) ?? {
      ...row,
      conditions: others,
      times: new Set(),
      timeless: false,
    };
    const times = row.conditions.filter((c) => TIMES.includes(c));
    if (times.length === 0) group.timeless = true;
    times.forEach((time) => group.times.add(time));
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(({ times, timeless, ...row }) => ({
      ...row,
      conditions:
        timeless || times.size === TIMES.length
          ? row.conditions
          : [...TIMES.filter((t) => times.has(t)), ...row.conditions],
      // `all` nas versões todas; senão a lista, na ordem do jogo (Ruby, Emerald…).
      versions:
        row.versions.size === VERSIONS.size
          ? 'all'
          : game.versions.filter((version) => row.versions.has(version)),
    }))
    .sort(
      (a, b) =>
        METHOD_ORDER.indexOf(a.method) - METHOD_ORDER.indexOf(b.method) ||
        a.minLevel - b.minLevel ||
        a.area.localeCompare(b.area, 'en', { numeric: true }) ||
        a.method.localeCompare(b.method),
    );
}

/** Espécies e cadeias evolutivas até o último id considerado, com as arestas pai → filho. */
async function loadEvolution(lastId) {
  const species = await mapWithConcurrency(range(1, lastId), (id) =>
    getJson(`${API}/pokemon-species/${id}`),
  );
  const chainUrls = [...new Set(species.map((item) => item.evolution_chain?.url).filter(Boolean))];
  const chains = await mapWithConcurrency(chainUrls, (url) => getJson(url));

  const edges = [];
  const walk = (link) => {
    const parent = idFromUrl(link.species.url);
    for (const next of link.evolves_to) {
      const child = idFromUrl(next.species.url);
      // Quem tem forma por local (Leafeon, Magnezone…) só evoluía assim até a
      // geração 7; as formas por item que a PokeAPI lista junto vieram depois.
      const reachable =
        next.evolution_details.length > 0 &&
        next.evolution_details.every((detail) => detail.location === null);
      edges.push({ parent, child, reachable });
      walk(next);
    }
  };
  chains.forEach((chain) => walk(chain.chain));

  const legendary = new Set(
    species.filter((item) => item.is_legendary || item.is_mythical).map((item) => item.id),
  );
  /** Id da forma base da família de cada espécie. */
  const root = new Map();
  for (const item of species) {
    const chain = chains.find((c) => c.id === idFromUrl(item.evolution_chain?.url ?? ''));
    root.set(item.id, chain ? idFromUrl(chain.chain.species.url) : item.id);
  }
  /** Profundidade na linha evolutiva (0 = base). */
  const depth = new Map();
  const setDepth = (link, level) => {
    depth.set(idFromUrl(link.species.url), level);
    link.evolves_to.forEach((next) => setDepth(next, level + 1));
  };
  chains.forEach((chain) => setDepth(chain.chain, 0));

  return { edges, legendary, root, depth };
}

/**
 * Obtíveis no jogo: quem aparece em algum lugar, mais evoluções (menos as que
 * pedem um local de outra região, como Leafeon) e pré-evoluções (reprodução),
 * até não entrar mais ninguém. Quem está em `unobtainable` nunca entra.
 */
function availableFrom(encounteredIds, edges) {
  const blocked = new Set(Object.keys(game.unobtainable ?? {}).map(Number));
  const available = new Set(encounteredIds.filter((id) => !blocked.has(id)));
  let grew = true;
  while (grew) {
    grew = false;
    for (const { parent, child, reachable } of edges) {
      if (parent > LAST_ID || child > LAST_ID) continue;
      if (blocked.has(parent) || blocked.has(child)) continue;
      if (available.has(parent) && reachable && !available.has(child)) {
        available.add(child);
        grew = true;
      }
      if (available.has(child) && !available.has(parent)) {
        available.add(parent);
        grew = true;
      }
    }
  }
  return [...available].sort((a, b) => a - b);
}

/** Índice da área na história — o prefixo mais longo que casar. */
function areaStep(area) {
  let best = -1;
  let bestLength = -1;
  progression.areas.forEach((prefix, index) => {
    const matches =
      area === prefix || (area.startsWith(prefix) && /[\s;(]/.test(area[prefix.length]));
    if (matches && prefix.length > bestLength) {
      best = index;
      bestLength = prefix.length;
    }
  });
  if (best === -1) unknownAreas.add(area);
  return best === -1 ? progression.areas.length : best;
}

function stepOf(areaPrefix) {
  const index = progression.areas.indexOf(areaPrefix);
  if (index === -1) throw new Error(`Área de progressão desconhecida: ${areaPrefix}`);
  return index;
}

/** Quando dá para fazer esse encontro: o mais tardio entre área, método e condições. */
function rowStep(row) {
  const needs = [areaStep(row.area)];
  const method = progression.methods[row.method];
  if (method) needs.push(stepOf(method));
  for (const condition of row.conditions) {
    const unlock = progression.conditions[condition];
    if (unlock) needs.push(stepOf(unlock));
  }
  return Math.max(...needs);
}

/**
 * Ordem de jogo: iniciais, depois cada família no ponto da história em que o
 * primeiro membro fica disponível (a família vem junta, da base para a
 * evolução final), e os lendários por último, também na ordem em que aparecem.
 */
function storyOrder(ids, evolution) {
  const never = progression.areas.length + 1;
  const own = new Map(
    ids.map((id) => {
      const first = Math.min(never, ...(byId.get(id) ?? []).map(rowStep));
      const floor = progression.notBefore?.[id];
      return [id, floor ? Math.max(first, stepOf(floor)) : first];
    }),
  );
  const familyStep = new Map();
  for (const id of ids) {
    const family = evolution.root.get(id) ?? id;
    familyStep.set(family, Math.min(familyStep.get(family) ?? never, own.get(id)));
  }
  const starters = new Set(progression.starters.map((id) => evolution.root.get(id) ?? id));
  const key = (id) => {
    const family = evolution.root.get(id) ?? id;
    const legendary = evolution.legendary.has(id);
    const group = starters.has(family) ? 0 : legendary ? 2 : 1;
    const step = legendary ? own.get(id) : familyStep.get(family);
    const starterIndex = starters.has(family) ? progression.starters.indexOf(family) : 0;
    return [group, step, starterIndex, family, evolution.depth.get(id) ?? 0, id];
  };
  return [...ids].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return ka[i] - kb[i];
    }
    return 0;
  });
}

const candidates = game.ids === 'available' ? range(1, LAST_ID) : range(game.ids.from, game.ids.to);
const entries = await mapWithConcurrency(candidates, fetchEncounters);
const byId = new Map(entries.map((entry) => [entry.id, entry.rows]));

const evolution = await loadEvolution(Math.max(...candidates));
const ids =
  game.ids === 'available'
    ? availableFrom(
        entries.filter(({ rows }) => rows.length > 0).map(({ id }) => id),
        evolution.edges,
      )
    : candidates;

const ordered = storyOrder(ids, evolution);
const availableFile = `${game.key}-available.ts`;
await writeFile(
  new URL(`../src/app/core/data/${availableFile}`, import.meta.url),
  `// ARQUIVO GERADO — não edite à mão.
// Rode \`node scripts/generate-encounters.mjs ${game.key}\` para regerar a partir da PokeAPI.

/**
 * Pokémon obtíveis no jogo, na ordem da história: iniciais, depois cada
 * família no ponto em que aparece pela primeira vez, e os lendários no fim.
 */
export const AVAILABLE_IDS: readonly number[] = [
${ordered.join(', ')},
];
`,
  'utf8',
);
console.log(`${availableFile} gerado com ${ordered.length} Pokémon, na ordem da história.`);
if (unknownAreas.size > 0) {
  console.log(`Áreas fora da progressão (vão para o fim): ${[...unknownAreas].join(' | ')}`);
}

const body = ids
  .map((id) => {
    const rows = byId.get(id) ?? [];
    if (rows.length === 0) return `  ${id}: [],`;
    const lines = rows.map(
      (row) =>
        `    { area: ${str(row.area)}, method: '${row.method}', minLevel: ${row.minLevel}, ` +
        `maxLevel: ${row.maxLevel}, chance: ${row.chance}, versions: ${versionsLiteral(row.versions)}, ` +
        `conditions: [${row.conditions.map(str).join(', ')}] },`,
    );
    return `  ${id}: [\n${lines.join('\n')}\n  ],`;
  })
  .join('\n');

function versionsLiteral(versions) {
  return versions === 'all' ? "'all'" : `[${versions.map(str).join(', ')}]`;
}

const fileName = `${game.key}-encounters.ts`;
const file = `// ARQUIVO GERADO — não edite à mão.
// Rode \`node scripts/generate-encounters.mjs ${game.key}\` para regerar a partir da PokeAPI.
import type { PokemonEncounter } from '../models/pokemon.model';

/** Vazio = não aparece na natureza (só por evolução, reprodução ou troca). */
export const ENCOUNTERS: Readonly<Record<number, readonly PokemonEncounter[]>> = {
${body}
};
`;

await writeFile(new URL(`../src/app/core/data/${fileName}`, import.meta.url), file, 'utf8');
const found = ids.filter((id) => (byId.get(id) ?? []).length > 0).length;
console.log(`${fileName} gerado: ${found} de ${ids.length} Pokémon com local.`);
if (skipped.size > 0) {
  console.log(`Métodos ignorados: ${[...skipped].join(', ')}`);
}
