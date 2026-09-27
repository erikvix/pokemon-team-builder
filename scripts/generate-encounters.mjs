/**
 * Gera `src/app/core/data/frlg-encounters.ts` a partir da PokeAPI.
 *
 * Onde cada um dos 151 aparece em FireRed/LeafGreen: área, forma de encontro
 * (grama, vara, surf, presente…), faixa de nível, chance e em qual versão.
 * Ao vivo seriam uma requisição por Pokémon mais uma por área para traduzir
 * o nome; gerado uma vez, o modal abre na hora.
 *
 * Uso: node scripts/generate-encounters.mjs
 */
import { writeFile } from 'node:fs/promises';

const API = 'https://pokeapi.co/api/v2';
const VERSIONS = new Set(['firered', 'leafgreen']);
const LAST_GEN1_ID = 151;
const CONCURRENCY = 8;

/**
 * Formas de encontro que existem no jogo. Ficam de fora as de eventos e
 * discos bônus (Colosseum, Pokémon Channel…), que a PokeAPI mistura.
 */
const METHODS = new Set([
  'walk',
  'old-rod',
  'good-rod',
  'super-rod',
  'surf',
  'rock-smash',
  'gift',
  'gift-egg',
  'static',
  'pokeflute',
  'npc-trade',
  'roaming-grass',
]);

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

const areaNames = new Map();
async function areaName(resource) {
  if (!areaNames.has(resource.name)) {
    const data = await getJson(resource.url);
    const english = data.names.find((item) => item.language.name === 'en')?.name;
    // A PokeAPI chama algumas rotas de Kanto de "Road"; no jogo é "Route".
    areaNames.set(resource.name, (english ?? resource.name).replace(/^Road (\d)/, 'Route $1'));
  }
  return areaNames.get(resource.name);
}

const skipped = new Set();

async function fetchEncounters(id) {
  const data = await getJson(`${API}/pokemon/${id}/encounters`);
  /** Chave área+método; junta as duas versões numa linha só. */
  const merged = new Map();
  for (const area of data) {
    for (const version of area.version_details) {
      if (!VERSIONS.has(version.version.name)) continue;
      const byMethod = new Map();
      for (const detail of version.encounter_details) {
        const method = detail.method.name;
        if (!METHODS.has(method)) {
          skipped.add(method);
          continue;
        }
        const current = byMethod.get(method) ?? { min: Infinity, max: 0, chance: 0 };
        current.min = Math.min(current.min, detail.min_level);
        current.max = Math.max(current.max, detail.max_level);
        current.chance += detail.chance;
        byMethod.set(method, current);
      }
      for (const [method, stats] of byMethod) {
        const key = `${area.location_area.name}|${method}`;
        const row = merged.get(key) ?? {
          area: await areaName(area.location_area),
          method,
          minLevel: stats.min,
          maxLevel: stats.max,
          chance: 0,
          versions: new Set(),
        };
        row.minLevel = Math.min(row.minLevel, stats.min);
        row.maxLevel = Math.max(row.maxLevel, stats.max);
        row.chance = Math.max(row.chance, Math.min(100, stats.chance));
        row.versions.add(version.version.name);
        merged.set(key, row);
      }
    }
  }
  const rows = [...merged.values()]
    .map((row) => ({
      ...row,
      versions: row.versions.size === 2 ? 'both' : [...row.versions][0],
    }))
    .sort(
      (a, b) => a.minLevel - b.minLevel || a.area.localeCompare(b.area, 'en', { numeric: true }),
    );
  return { id, rows };
}

const ids = Array.from({ length: LAST_GEN1_ID }, (_, i) => i + 1);
const entries = await mapWithConcurrency(ids, fetchEncounters, CONCURRENCY);
entries.sort((a, b) => a.id - b.id);

const str = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const body = entries
  .map(({ id, rows }) =>
    rows.length === 0
      ? `  ${id}: [],`
      : `  ${id}: [\n` +
        rows
          .map(
            (row) =>
              `    { area: ${str(row.area)}, method: '${row.method}', minLevel: ${row.minLevel}, ` +
              `maxLevel: ${row.maxLevel}, chance: ${row.chance}, versions: '${row.versions}' },`,
          )
          .join('\n') +
        `\n  ],`,
  )
  .join('\n');

const file = `// ARQUIVO GERADO — não edite à mão.
// Rode \`node scripts/generate-encounters.mjs\` para regerar a partir da PokeAPI.
import type { EncounterMethod, GameVersions } from '../models/pokemon.model';

/** Uma área onde o Pokémon aparece em FireRed/LeafGreen. */
export interface FrlgEncounter {
  /** Nome da área como no jogo (inglês — a PokeAPI não tem português). */
  readonly area: string;
  readonly method: EncounterMethod;
  readonly minLevel: number;
  readonly maxLevel: number;
  /** Chance somada dos slots desse método na área, em %. */
  readonly chance: number;
  readonly versions: GameVersions;
}

/** Vazio = não aparece na natureza (só por evolução ou troca). */
export const FRLG_ENCOUNTERS: Readonly<Record<number, readonly FrlgEncounter[]>> = {
${body}
};
`;

await writeFile(new URL('../src/app/core/data/frlg-encounters.ts', import.meta.url), file, 'utf8');
const found = entries.filter(({ rows }) => rows.length > 0).length;
console.log(`frlg-encounters.ts gerado: ${found} de ${entries.length} Pokémon com local.`);
if (skipped.size > 0) {
  console.log(`Métodos ignorados: ${[...skipped].join(', ')}`);
}
