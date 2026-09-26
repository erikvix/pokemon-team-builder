import type { PokemonType } from '../data/pokemon-types';

export interface BaseStats {
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly specialAttack: number;
  readonly specialDefense: number;
  readonly speed: number;
}

export const STAT_KEYS = [
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

/** Rótulos curtos (HP, Atk, Def, SpA, SpD, Spe) e o nome por extenso. */
export const STAT_LABEL: Readonly<Record<StatKey, { short: string; long: string }>> = {
  hp: { short: 'HP', long: 'Pontos de vida' },
  attack: { short: 'Atk', long: 'Ataque' },
  defense: { short: 'Def', long: 'Defesa' },
  specialAttack: { short: 'SpA', long: 'Ataque especial' },
  specialDefense: { short: 'SpD', long: 'Defesa especial' },
  speed: { short: 'Spe', long: 'Velocidade' },
};

/** Maior base stat da geração 1 (Chansey, 250 de HP) — escala das barras. */
export const MAX_BASE_STAT = 255;

export function statTotal(stats: BaseStats): number {
  return (
    stats.hp +
    stats.attack +
    stats.defense +
    stats.specialAttack +
    stats.specialDefense +
    stats.speed
  );
}

/** O que a listagem e os slots do time precisam saber. */
export interface PokemonSummary {
  readonly id: number;
  /** Nome como a PokeAPI usa (`nidoran-f`) — chave de busca e de rota. */
  readonly name: string;
  /** Nome para exibição (`Nidoran♀`). */
  readonly displayName: string;
  readonly types: readonly PokemonType[];
  readonly stats: BaseStats;
  readonly statTotal: number;
  readonly spriteUrl: string;
  readonly artworkUrl: string;
}

export interface PokemonAbility {
  readonly name: string;
  readonly displayName: string;
  readonly isHidden: boolean;
}

export interface EvolutionStage {
  readonly id: number;
  /** Profundidade na linha (0 = forma base). Ramificações compartilham nível. */
  readonly stage: number;
  readonly name: string;
  readonly displayName: string;
  readonly spriteUrl: string;
  /** Nível mínimo, quando a evolução é por nível. */
  readonly minLevel: number | null;
  /** Descrição curta do gatilho (`Pedra da Água`, `Nível 16`, `Troca`). */
  readonly trigger: string | null;
}

/** Tudo que a tela de detalhe mostra. */
export interface PokemonDetail extends PokemonSummary {
  /** Decímetros. */
  readonly height: number;
  /** Hectogramas. */
  readonly weight: number;
  readonly abilities: readonly PokemonAbility[];
  /** Texto da Pokédex; `null` quando a espécie não tem entrada disponível. */
  readonly flavorText: string | null;
  /** Categoria da espécie (`Semente`), quando disponível. */
  readonly genus: string | null;
  /** Linha evolutiva completa, em ordem; vazia se a espécie não evolui. */
  readonly evolutionLine: readonly EvolutionStage[];
}

export type MoveCategory = 'physical' | 'special' | 'status';

/** Como o golpe é aprendido — ordem em que o modal de ataques mostra. */
export type MoveLearnMethod = 'levelUp' | 'machine' | 'tutor' | 'egg';

/** Um golpe que o Pokémon aprende, com os dados do jogo selecionado. */
export interface PokemonMove {
  readonly name: string;
  readonly displayName: string;
  /** `null` é o tipo "???" (Curse, na geração 3). */
  readonly type: PokemonType | null;
  readonly category: MoveCategory;
  readonly power: number | null;
  readonly accuracy: number | null;
  readonly pp: number | null;
  readonly description: string | null;
  /** Nível em que aprende — só em `levelUp`; 1 inclui os golpes iniciais. */
  readonly level: number | null;
  /** `TM24`, `HM03` — só em `machine`. */
  readonly machine: string | null;
}

/** Tudo o que o Pokémon aprende no jogo, agrupado por forma de aprender. */
export type PokemonMoveset = Readonly<Record<MoveLearnMethod, readonly PokemonMove[]>>;
