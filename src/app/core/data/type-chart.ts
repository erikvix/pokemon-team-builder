import { POKEMON_TYPES, type PokemonType } from './pokemon-types';

/** Multiplicadores possíveis de um único par atacante × defensor. */
export type SingleMultiplier = 0 | 0.5 | 2;

/**
 * Tabela de eficácia de tipos.
 *
 * Só os pares diferentes de 1x aparecem: o que não está listado é neutro.
 * Leitura: `TYPE_CHART[atacante][defensor]`.
 *
 * Usa a tabela vigente (gen 6+, 18 tipos). Veja a nota "tabela de tipos" no
 * README: a tabela original da gen 1 tem 15 tipos e não cobre a matriz de 18
 * colunas pedida na análise de time.
 */
export const TYPE_CHART: Readonly<
  Record<PokemonType, Readonly<Partial<Record<PokemonType, SingleMultiplier>>>>
> = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: {
    fire: 2,
    electric: 2,
    grass: 0.5,
    poison: 2,
    flying: 0,
    bug: 0.5,
    rock: 2,
    steel: 2,
  },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

/** Multiplicadores possíveis contra um Pokémon de um ou dois tipos. */
export type Effectiveness = 0 | 0.25 | 0.5 | 1 | 2 | 4;

/** Classificação textual — a interface nunca usa só cor para diferenciar. */
export type EffectivenessBucket = 'immune' | 'resistant' | 'neutral' | 'weak';

/**
 * Quanto um ataque do tipo `attacking` causa num defensor com `defending`
 * (um ou dois tipos). Multiplica os fatores de cada tipo defensivo.
 */
export function effectivenessAgainst(
  attacking: PokemonType,
  defending: readonly PokemonType[],
): Effectiveness {
  const row = TYPE_CHART[attacking];
  let total = 1;
  for (const type of defending) {
    total *= row[type] ?? 1;
  }
  return total as Effectiveness;
}

/**
 * Perfil defensivo completo: o que cada um dos 18 tipos causa neste Pokémon.
 */
export function defensiveProfile(
  defending: readonly PokemonType[],
): Readonly<Record<PokemonType, Effectiveness>> {
  const profile = {} as Record<PokemonType, Effectiveness>;
  for (const attacking of POKEMON_TYPES) {
    profile[attacking] = effectivenessAgainst(attacking, defending);
  }
  return profile;
}

/**
 * Melhor multiplicador ofensivo que os tipos de um atacante conseguem contra
 * um defensor — usado para medir a cobertura ofensiva do time.
 */
export function bestOffensiveMultiplier(
  attackingTypes: readonly PokemonType[],
  defending: readonly PokemonType[],
): Effectiveness {
  let best: Effectiveness = 0;
  for (const attacking of attackingTypes) {
    const value = effectivenessAgainst(attacking, defending);
    if (value > best) {
      best = value;
    }
  }
  return best;
}

export function bucketOf(multiplier: Effectiveness): EffectivenessBucket {
  if (multiplier === 0) return 'immune';
  if (multiplier < 1) return 'resistant';
  if (multiplier > 1) return 'weak';
  return 'neutral';
}

/** Rótulo curto do multiplicador (`0x`, `¼x`, `½x`, `1x`, `2x`, `4x`). */
export function multiplierLabel(multiplier: Effectiveness): string {
  switch (multiplier) {
    case 0:
      return '0x';
    case 0.25:
      return '¼x';
    case 0.5:
      return '½x';
    case 2:
      return '2x';
    case 4:
      return '4x';
    default:
      return '1x';
  }
}

/** Agrupa o perfil defensivo por multiplicador, do mais grave ao mais fraco. */
export function groupDefensiveProfile(
  defending: readonly PokemonType[],
): ReadonlyArray<{ multiplier: Effectiveness; types: readonly PokemonType[] }> {
  const profile = defensiveProfile(defending);
  const order: Effectiveness[] = [4, 2, 0.5, 0.25, 0];
  return order
    .map((multiplier) => ({
      multiplier,
      types: POKEMON_TYPES.filter((type) => profile[type] === multiplier),
    }))
    .filter((group) => group.types.length > 0);
}
