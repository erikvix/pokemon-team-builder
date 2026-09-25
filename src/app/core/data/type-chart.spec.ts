import { describe, expect, it } from 'vitest';
import { POKEMON_TYPES } from './pokemon-types';
import {
  TYPE_CHART,
  bestOffensiveMultiplier,
  bucketOf,
  defensiveProfile,
  effectivenessAgainst,
  groupDefensiveProfile,
  multiplierLabel,
} from './type-chart';

describe('effectivenessAgainst', () => {
  it('devolve 1x quando não há relação especial', () => {
    expect(effectivenessAgainst('normal', ['water'])).toBe(1);
  });

  it('multiplica os dois tipos do defensor', () => {
    // Charizard (fogo/voador) toma 4x de pedra.
    expect(effectivenessAgainst('rock', ['fire', 'flying'])).toBe(4);
  });

  it('acumula resistência dupla', () => {
    // Venusaur (planta/venenoso) resiste duas vezes a planta.
    expect(effectivenessAgainst('grass', ['grass', 'poison'])).toBe(0.25);
  });

  it('imunidade vence qualquer fraqueza', () => {
    // Gengar (fantasma/venenoso) é imune a lutador...
    expect(effectivenessAgainst('fighting', ['ghost', 'poison'])).toBe(0);
    // ...e Gyarados (água/voador) é imune a terrestre mesmo tomando 2x de elétrico.
    expect(effectivenessAgainst('ground', ['water', 'flying'])).toBe(0);
    expect(effectivenessAgainst('electric', ['water', 'flying'])).toBe(4);
  });

  it('não depende da ordem dos tipos defensivos', () => {
    expect(effectivenessAgainst('ice', ['dragon', 'flying'])).toBe(
      effectivenessAgainst('ice', ['flying', 'dragon']),
    );
  });
});

describe('TYPE_CHART', () => {
  it('cobre os 18 tipos como atacantes', () => {
    expect(Object.keys(TYPE_CHART).sort()).toEqual([...POKEMON_TYPES].sort());
  });

  it('só registra pares diferentes de 1x', () => {
    for (const row of Object.values(TYPE_CHART)) {
      for (const multiplier of Object.values(row)) {
        expect([0, 0.5, 2]).toContain(multiplier);
      }
    }
  });
});

describe('defensiveProfile', () => {
  it('descreve os 18 tipos atacantes', () => {
    const profile = defensiveProfile(['electric']);
    expect(Object.keys(profile)).toHaveLength(18);
    expect(profile.ground).toBe(2);
    expect(profile.electric).toBe(0.5);
    // Voador é resistido por elétrico; normal não tem relação com elétrico.
    expect(profile.flying).toBe(0.5);
    expect(profile.normal).toBe(1);
  });
});

describe('groupDefensiveProfile', () => {
  it('agrupa do mais grave ao mais fraco e omite o neutro', () => {
    const groups = groupDefensiveProfile(['fire', 'flying']);
    expect(groups.map((group) => group.multiplier)).toEqual([4, 2, 0.5, 0.25, 0]);
    expect(groups[0]?.types).toEqual(['rock']);
    expect(groups.find((group) => group.multiplier === 0.25)?.types).toEqual(['grass', 'bug']);
  });

  it('inclui o grupo de imunidade quando existe', () => {
    const groups = groupDefensiveProfile(['ghost']);
    expect(groups.find((group) => group.multiplier === 0)?.types).toEqual(['normal', 'fighting']);
  });
});

describe('bestOffensiveMultiplier', () => {
  it('usa o melhor dos tipos do atacante', () => {
    // Charizard bate em pedra? Fogo 0.5x, voador 0.5x → melhor é 0.5x.
    expect(bestOffensiveMultiplier(['fire', 'flying'], ['rock'])).toBe(0.5);
    // Contra inseto, fogo dá 2x e voador dá 2x.
    expect(bestOffensiveMultiplier(['fire', 'flying'], ['bug'])).toBe(2);
  });

  it('devolve 0 para um atacante sem tipos', () => {
    expect(bestOffensiveMultiplier([], ['bug'])).toBe(0);
  });
});

describe('bucketOf / multiplierLabel', () => {
  it('classifica cada faixa', () => {
    expect(bucketOf(0)).toBe('immune');
    expect(bucketOf(0.25)).toBe('resistant');
    expect(bucketOf(0.5)).toBe('resistant');
    expect(bucketOf(1)).toBe('neutral');
    expect(bucketOf(2)).toBe('weak');
    expect(bucketOf(4)).toBe('weak');
  });

  it('rotula os multiplicadores', () => {
    expect(multiplierLabel(0)).toBe('0x');
    expect(multiplierLabel(0.25)).toBe('¼x');
    expect(multiplierLabel(0.5)).toBe('½x');
    expect(multiplierLabel(1)).toBe('1x');
    expect(multiplierLabel(2)).toBe('2x');
    expect(multiplierLabel(4)).toBe('4x');
  });
});
