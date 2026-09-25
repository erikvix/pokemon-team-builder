import { POKEMON_TYPES, type PokemonType } from '../data/pokemon-types';
import { bestOffensiveMultiplier, effectivenessAgainst } from '../data/type-chart';
import { STAT_KEYS, statTotal, type BaseStats, type PokemonSummary } from '../models/pokemon.model';

/** A partir de quantos membros fracos ao mesmo tipo a fraqueza vira alerta. */
export const COMMON_WEAKNESS_THRESHOLD = 3;

export interface TypeCoverageRow {
  readonly type: PokemonType;
  /** Membros que tomam dano aumentado (2x ou 4x) deste tipo. */
  readonly weak: number;
  /** Membros que resistem (½x ou ¼x). */
  readonly resistant: number;
  /** Membros imunes (0x). */
  readonly immune: number;
  /** Membros que batem em cima deste tipo com 2x ou mais. */
  readonly offense: number;
  /** `weak >= COMMON_WEAKNESS_THRESHOLD`. */
  readonly isCommonWeakness: boolean;
  /** Nenhum membro resiste nem é imune a este tipo. */
  readonly hasNoResistance: boolean;
  /** Nenhum membro acerta este tipo com vantagem. */
  readonly hasNoOffense: boolean;
}

export interface TeamAnalysis {
  readonly memberCount: number;
  readonly rows: readonly TypeCoverageRow[];
  readonly commonWeaknesses: readonly PokemonType[];
  readonly uncoveredTypes: readonly PokemonType[];
  readonly offensiveGaps: readonly PokemonType[];
  /** Tipos ofensivos que o time tem em mãos (os tipos dos próprios membros). */
  readonly offensiveTypes: readonly PokemonType[];
  readonly averageStats: BaseStats;
  readonly averageStatTotal: number;
}

/**
 * Análise defensiva e ofensiva do time. Função pura: recebe os membros, devolve
 * os números. Time vazio devolve a estrutura zerada, sem alertas.
 */
export function analyzeTeam(members: readonly PokemonSummary[]): TeamAnalysis {
  const attackingTypes = uniqueTypes(members);

  const rows = POKEMON_TYPES.map<TypeCoverageRow>((type) => {
    let weak = 0;
    let resistant = 0;
    let immune = 0;

    for (const member of members) {
      const multiplier = effectivenessAgainst(type, member.types);
      if (multiplier === 0) {
        immune++;
      } else if (multiplier > 1) {
        weak++;
      } else if (multiplier < 1) {
        resistant++;
      }
    }

    const offense = members.filter(
      (member) => bestOffensiveMultiplier(member.types, [type]) > 1,
    ).length;

    return {
      type,
      weak,
      resistant,
      immune,
      offense,
      isCommonWeakness: weak >= COMMON_WEAKNESS_THRESHOLD,
      hasNoResistance: members.length > 0 && resistant + immune === 0,
      hasNoOffense: members.length > 0 && offense === 0,
    };
  });

  return {
    memberCount: members.length,
    rows,
    commonWeaknesses: rows.filter((row) => row.isCommonWeakness).map((row) => row.type),
    uncoveredTypes: rows.filter((row) => row.hasNoResistance).map((row) => row.type),
    offensiveGaps: rows.filter((row) => row.hasNoOffense).map((row) => row.type),
    offensiveTypes: attackingTypes,
    averageStats: averageStats(members),
    averageStatTotal: members.length === 0 ? 0 : Math.round(averageOf(members, statTotalOf)),
  };
}

/** Tipos ofensivos presentes no time, sem repetição, em ordem canônica. */
export function uniqueTypes(members: readonly PokemonSummary[]): readonly PokemonType[] {
  const present = new Set<PokemonType>();
  for (const member of members) {
    for (const type of member.types) {
      present.add(type);
    }
  }
  return POKEMON_TYPES.filter((type) => present.has(type));
}

function statTotalOf(member: PokemonSummary): number {
  return statTotal(member.stats);
}

function averageOf(members: readonly PokemonSummary[], pick: (m: PokemonSummary) => number): number {
  return members.reduce((sum, member) => sum + pick(member), 0) / members.length;
}

function averageStats(members: readonly PokemonSummary[]): BaseStats {
  if (members.length === 0) {
    return { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };
  }
  const result = {} as Record<(typeof STAT_KEYS)[number], number>;
  for (const key of STAT_KEYS) {
    result[key] = Math.round(averageOf(members, (member) => member.stats[key]));
  }
  return result;
}
