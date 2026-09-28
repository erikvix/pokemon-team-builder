import type { VersionId } from '../models/pokemon.model';
import { AVAILABLE_IDS as HGSS_AVAILABLE_IDS } from './hgss-available';
import type { PokemonType } from './pokemon-types';

export type GameId = 'firered-leafgreen' | 'heartgold-soulsilver';

export interface GameVersion {
  readonly id: VersionId;
  readonly label: string;
  /** Tipo cuja cor lembra a capa (Fogo para FireRed, Planta para LeafGreen…). */
  readonly colorType: PokemonType;
}

/**
 * Um jogo para montar time. Cada um tem seus Pokémon, seu time salvo e seus
 * índices de ataques e locais (`<jogo>-moves.ts`, `<jogo>-encounters.ts`).
 * Um jogo novo entra aqui, em `scripts/lib.mjs` e no `GAME_DATA` do
 * `PokemonService`.
 */
export interface Game {
  readonly id: GameId;
  /** `FireRed / LeafGreen` — para frases e rótulos curtos. */
  readonly shortTitle: string;
  readonly title: string;
  readonly generation: string;
  readonly region: string;
  readonly year: number;
  readonly versions: readonly [GameVersion, GameVersion];
  /** Logo do jogo (SVG em `public/games/`); sem logo, o card mostra `artworkIds`. */
  readonly logo: string | null;
  /** Artworks que ilustram o card quando não há logo (os lendários da capa). */
  readonly artworkIds: readonly number[];
  /** Tipos que dão o acento visual do card. */
  readonly accentTypes: readonly PokemonType[];
  readonly summary: string;
  /** Pokémon do jogo, em ordem de Pokédex nacional. */
  readonly pokemonIds: readonly number[];
}

export const GAMES: readonly Game[] = [
  {
    id: 'firered-leafgreen',
    shortTitle: 'FireRed / LeafGreen',
    title: 'Pokémon FireRed / LeafGreen',
    generation: 'Geração 1',
    region: 'Kanto',
    year: 2004,
    versions: [
      { id: 'firered', label: 'FireRed', colorType: 'fire' },
      { id: 'leafgreen', label: 'LeafGreen', colorType: 'grass' },
    ],
    logo: 'games/firered.svg',
    artworkIds: [],
    accentTypes: ['fire', 'grass'],
    summary: 'Os 151 originais de Kanto, de Bulbasaur a Mew.',
    pokemonIds: Array.from({ length: 151 }, (_, index) => index + 1),
  },
  {
    id: 'heartgold-soulsilver',
    shortTitle: 'HeartGold / SoulSilver',
    title: 'Pokémon HeartGold / SoulSilver',
    generation: 'Geração 2',
    region: 'Johto e Kanto',
    year: 2009,
    versions: [
      { id: 'heartgold', label: 'HeartGold', colorType: 'electric' },
      { id: 'soulsilver', label: 'SoulSilver', colorType: 'steel' },
    ],
    logo: null,
    artworkIds: [250, 249],
    accentTypes: ['fire', 'psychic'],
    summary: 'Johto e Kanto: todos os Pokémon que dá para pegar, ganhar ou evoluir no jogo.',
    pokemonIds: HGSS_AVAILABLE_IDS,
  },
];

export const DEFAULT_GAME_ID: GameId = 'firered-leafgreen';

export function findGame(id: string | null | undefined): Game | undefined {
  return GAMES.find((game) => game.id === id);
}
