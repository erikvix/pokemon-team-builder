import type { PokemonType } from '../../core/data/pokemon-types';

/**
 * Um jogo disponível para montar time. Hoje só existe um; a lista é o ponto
 * de extensão quando outras gerações entrarem.
 */
export interface Game {
  readonly id: string;
  readonly title: string;
  readonly generation: string;
  readonly region: string;
  /** Faixa da Pokédex nacional coberta pelo jogo. */
  readonly range: { readonly from: number; readonly to: number };
  readonly year: number;
  /** Ids dos iniciais, usados como ilustração do card. */
  readonly starterIds: readonly number[];
  /** Tipos que dão o acento visual do card (Fogo e Planta, no caso). */
  readonly accentTypes: readonly PokemonType[];
  readonly summary: string;
}

export const GAMES: readonly Game[] = [
  {
    id: 'firered-leafgreen',
    title: 'Pokémon FireRed / LeafGreen',
    generation: 'Geração 1',
    region: 'Kanto',
    range: { from: 1, to: 151 },
    year: 2004,
    starterIds: [4, 1, 7],
    accentTypes: ['fire', 'grass'],
    summary: 'Os 151 originais de Kanto, de Bulbasaur a Mew.',
  },
];
