import type { MoveCategory } from '../models/pokemon.model';
import type { PokemonType } from './pokemon-types';

/**
 * Formato dos índices gerados por jogo (`<jogo>-moves.ts`). Fica fora dos
 * arquivos gerados para os dois jogos compartilharem o mesmo contrato.
 */

/** Dados do golpe como eram no jogo. */
export interface GameMove {
  /** `null` é o tipo "???" (só Curse, até a geração 4). */
  readonly type: PokemonType | null;
  /** Na geração 3 a categoria vem do tipo; da 4 em diante, do golpe. */
  readonly category: MoveCategory;
  readonly power: number | null;
  readonly accuracy: number | null;
  readonly pp: number | null;
  /** `TM24`, `HM03` — quando o golpe é ensinado por máquina. */
  readonly machine: string | null;
  /** Texto do jogo (inglês — a PokeAPI não tem português). */
  readonly description: string | null;
}

export interface GameLearnset {
  /** `[nível, golpe]`, em ordem de nível. */
  readonly levelUp: ReadonlyArray<readonly [number, string]>;
  readonly machine: readonly string[];
  readonly tutor: readonly string[];
  readonly egg: readonly string[];
}
