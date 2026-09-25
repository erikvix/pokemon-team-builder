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
  /** Logo do jogo (SVG em `public/games/`), usado como ilustração do card. */
  readonly logo: string;
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
    logo: 'games/firered.svg',
    accentTypes: ['fire', 'grass'],
    summary: 'Os 151 originais de Kanto, de Bulbasaur a Mew.',
  },
];
