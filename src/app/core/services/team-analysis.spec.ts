import { describe, expect, it } from 'vitest';
import { GEN1_POKEDEX } from '../data/gen1-pokedex';
import { statTotal, type PokemonSummary } from '../models/pokemon.model';
import { analyzeTeam, uniqueTypes } from './team-analysis';

function member(id: number): PokemonSummary {
  const entry = GEN1_POKEDEX.find((item) => item.id === id);
  if (!entry) {
    throw new Error(`Pokémon ${id} fora do índice da geração 1`);
  }
  return {
    id: entry.id,
    name: entry.name,
    displayName: entry.name,
    types: entry.types,
    stats: entry.stats,
    statTotal: statTotal(entry.stats),
    spriteUrl: '',
    artworkUrl: '',
  };
}

const CHARIZARD = 6;
const BLASTOISE = 9;
const VENUSAUR = 3;
const PIDGEOT = 18;
const BUTTERFREE = 12;
const ZUBAT = 41;

describe('analyzeTeam', () => {
  it('devolve estrutura zerada e sem alertas para time vazio', () => {
    const analysis = analyzeTeam([]);
    expect(analysis.memberCount).toBe(0);
    expect(analysis.rows).toHaveLength(18);
    expect(analysis.commonWeaknesses).toEqual([]);
    expect(analysis.uncoveredTypes).toEqual([]);
    expect(analysis.offensiveGaps).toEqual([]);
    expect(analysis.averageStatTotal).toBe(0);
    expect(analysis.averageStats.hp).toBe(0);
  });

  it('conta fracos, resistentes e imunes por tipo', () => {
    const analysis = analyzeTeam([member(CHARIZARD), member(BLASTOISE)]);
    const electric = analysis.rows.find((row) => row.type === 'electric');
    expect(electric).toMatchObject({ weak: 2, resistant: 0, immune: 0 });

    const ground = analysis.rows.find((row) => row.type === 'ground');
    // Charizard é imune a terrestre (voador) e Blastoise toma dano neutro.
    expect(ground).toMatchObject({ weak: 0, immune: 1, resistant: 0 });

    const grass = analysis.rows.find((row) => row.type === 'grass');
    // Blastoise toma 2x de planta; Charizard resiste.
    expect(grass).toMatchObject({ weak: 1, resistant: 1, immune: 0 });
  });

  it('marca fraqueza comum a partir de 3 membros fracos ao mesmo tipo', () => {
    const flyers = [member(CHARIZARD), member(PIDGEOT), member(BUTTERFREE), member(ZUBAT)];
    const analysis = analyzeTeam(flyers);
    const electric = analysis.rows.find((row) => row.type === 'electric');
    expect(electric?.weak).toBeGreaterThanOrEqual(3);
    expect(electric?.isCommonWeakness).toBe(true);
    expect(analysis.commonWeaknesses).toContain('electric');
  });

  it('não marca fraqueza comum com apenas 2 membros fracos', () => {
    const analysis = analyzeTeam([member(CHARIZARD), member(PIDGEOT)]);
    const electric = analysis.rows.find((row) => row.type === 'electric');
    expect(electric?.weak).toBe(2);
    expect(electric?.isCommonWeakness).toBe(false);
  });

  it('aponta tipos sem nenhuma resistência no time', () => {
    const analysis = analyzeTeam([member(CHARIZARD)]);
    // Ninguém no time resiste a pedra.
    expect(analysis.uncoveredTypes).toContain('rock');
    // Fogo/voador resiste a planta, então planta não entra na lista.
    expect(analysis.uncoveredTypes).not.toContain('grass');
  });

  it('conta cobertura ofensiva e aponta as lacunas', () => {
    const analysis = analyzeTeam([member(CHARIZARD)]);
    const bug = analysis.rows.find((row) => row.type === 'bug');
    expect(bug?.offense).toBe(1);
    expect(bug?.hasNoOffense).toBe(false);

    const water = analysis.rows.find((row) => row.type === 'water');
    expect(water?.offense).toBe(0);
    expect(analysis.offensiveGaps).toContain('water');
  });

  it('lista os tipos ofensivos do time sem repetição e em ordem canônica', () => {
    const analysis = analyzeTeam([member(CHARIZARD), member(VENUSAUR), member(BLASTOISE)]);
    expect(analysis.offensiveTypes).toEqual(['fire', 'water', 'grass', 'poison', 'flying']);
  });

  it('calcula a média dos base stats', () => {
    const team = [member(CHARIZARD), member(BLASTOISE)];
    const analysis = analyzeTeam(team);
    const expectedHp = Math.round((team[0]!.stats.hp + team[1]!.stats.hp) / 2);
    expect(analysis.averageStats.hp).toBe(expectedHp);
    expect(analysis.averageStatTotal).toBe(
      Math.round((team[0]!.statTotal + team[1]!.statTotal) / 2),
    );
  });
});

describe('uniqueTypes', () => {
  it('remove repetições mantendo a ordem dos 18 tipos', () => {
    expect(uniqueTypes([member(VENUSAUR), member(ZUBAT)])).toEqual(['grass', 'poison', 'flying']);
  });
});
