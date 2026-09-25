/**
 * Gera `src/app/core/data/gen1-pokedex.ts` a partir da PokeAPI.
 *
 * A listagem da Pokédex precisa de tipo e base stats dos 151 Pokémon. Buscar
 * isso ao vivo custaria 151 requisições de ~270 kB cada no primeiro load, então
 * o índice é gerado uma vez e versionado. Os dados de detalhe continuam vindo
 * da API em tempo real.
 *
 * Uso: node scripts/generate-pokedex.mjs
 */
import { writeFile } from 'node:fs/promises';

const API = 'https://pokeapi.co/api/v2';
const LAST_GEN1_ID = 151;
const CONCURRENCY = 8;

const STAT_KEY = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
};

async function fetchPokemon(id) {
  const response = await fetch(`${API}/pokemon/${id}`);
  if (!response.ok) {
    throw new Error(`PokeAPI ${response.status} para o Pokémon ${id}`);
  }
  const data = await response.json();
  const stats = {};
  for (const entry of data.stats) {
    const key = STAT_KEY[entry.stat.name];
    if (key) {
      stats[key] = entry.base_stat;
    }
  }
  return {
    id: data.id,
    name: data.name,
    types: [...data.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    stats,
    height: data.height,
    weight: data.weight,
  };
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

const ids = Array.from({ length: LAST_GEN1_ID }, (_, i) => i + 1);
const entries = await mapWithConcurrency(ids, fetchPokemon, CONCURRENCY);
entries.sort((a, b) => a.id - b.id);

const rows = entries
  .map(
    (p) =>
      `  { id: ${p.id}, name: '${p.name}', types: [${p.types.map((t) => `'${t}'`).join(', ')}], ` +
      `stats: { hp: ${p.stats.hp}, attack: ${p.stats.attack}, defense: ${p.stats.defense}, ` +
      `specialAttack: ${p.stats.specialAttack}, specialDefense: ${p.stats.specialDefense}, ` +
      `speed: ${p.stats.speed} }, height: ${p.height}, weight: ${p.weight} },`,
  )
  .join('\n');

const file = `// ARQUIVO GERADO — não edite à mão.
// Rode \`node scripts/generate-pokedex.mjs\` para regerar a partir da PokeAPI.
import type { BaseStats } from '../models/pokemon.model';
import type { PokemonType } from './pokemon-types';

export interface Gen1PokedexEntry {
  readonly id: number;
  readonly name: string;
  readonly types: readonly PokemonType[];
  readonly stats: BaseStats;
  /** Decímetros, como a PokeAPI devolve. */
  readonly height: number;
  /** Hectogramas, como a PokeAPI devolve. */
  readonly weight: number;
}

export const GEN1_POKEDEX: readonly Gen1PokedexEntry[] = [
${rows}
];
`;

await writeFile(new URL('../src/app/core/data/gen1-pokedex.ts', import.meta.url), file, 'utf8');
console.log(`gen1-pokedex.ts gerado com ${entries.length} entradas.`);
