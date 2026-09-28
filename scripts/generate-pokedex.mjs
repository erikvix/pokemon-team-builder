/**
 * Gera `src/app/core/data/national-pokedex.ts` a partir da PokeAPI.
 *
 * A listagem da Pokédex precisa de tipo e base stats de #001 a #493 (até a
 * geração 4); cada jogo mostra só os seus. Buscar isso ao vivo custaria
 * centenas de requisições de ~270 kB cada no primeiro load, então
 * o índice é gerado uma vez e versionado. Os dados de detalhe continuam vindo
 * da API em tempo real.
 *
 * Uso: node scripts/generate-pokedex.mjs
 */
import { writeFile } from 'node:fs/promises';
import { API, LAST_NATIONAL_ID, mapWithConcurrency, range } from './lib.mjs';

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

const entries = await mapWithConcurrency(range(1, LAST_NATIONAL_ID), fetchPokemon);
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

export interface PokedexEntry {
  readonly id: number;
  readonly name: string;
  readonly types: readonly PokemonType[];
  readonly stats: BaseStats;
  /** Decímetros, como a PokeAPI devolve. */
  readonly height: number;
  /** Hectogramas, como a PokeAPI devolve. */
  readonly weight: number;
}

export const NATIONAL_POKEDEX: readonly PokedexEntry[] = [
${rows}
];
`;

await writeFile(new URL('../src/app/core/data/national-pokedex.ts', import.meta.url), file, 'utf8');
console.log(`national-pokedex.ts gerado com ${entries.length} entradas.`);
