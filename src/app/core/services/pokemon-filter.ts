import type { PokemonType } from '../data/pokemon-types';
import type { PokemonSummary } from '../models/pokemon.model';

export const SORT_KEYS = ['number', 'name', 'stats'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABEL: Readonly<Record<SortKey, string>> = {
  number: 'Número',
  name: 'Nome',
  stats: 'Total de stats',
};

export interface PokemonFilter {
  readonly query: string;
  /** Vazio = todos os tipos. Com vários, casa quem tem **qualquer** um deles. */
  readonly types: readonly PokemonType[];
  readonly sort: SortKey;
}

export const EMPTY_FILTER: PokemonFilter = { query: '', types: [], sort: 'number' };

/** Minúsculas e sem acento, para a busca não depender de digitação exata. */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Casa por nome (trecho) ou por número da Pokédex (`25`, `#025`, `025`). */
export function matchesQuery(pokemon: PokemonSummary, query: string): boolean {
  const term = normalize(query).replace(/^#/, '');
  if (term === '') {
    return true;
  }
  if (normalize(pokemon.displayName).includes(term) || pokemon.name.includes(term)) {
    return true;
  }
  if (/^\d+$/.test(term)) {
    return String(pokemon.id) === String(Number(term));
  }
  return false;
}

export function matchesTypes(pokemon: PokemonSummary, types: readonly PokemonType[]): boolean {
  return types.length === 0 || types.some((type) => pokemon.types.includes(type));
}

/** Aplica busca, filtro de tipo e ordenação. Não muta a lista recebida. */
export function filterPokemon(
  list: readonly PokemonSummary[],
  filter: PokemonFilter,
): readonly PokemonSummary[] {
  const result = list.filter(
    (pokemon) => matchesQuery(pokemon, filter.query) && matchesTypes(pokemon, filter.types),
  );

  switch (filter.sort) {
    case 'name':
      return [...result].sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
    case 'stats':
      return [...result].sort((a, b) => b.statTotal - a.statTotal || a.id - b.id);
    default:
      return result;
  }
}
