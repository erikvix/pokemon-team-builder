import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_TEAM_SIZE, TeamService, parseShareCode } from './team.service';

function makeService(): TeamService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideHttpClient()] });
  return TestBed.inject(TeamService);
}

describe('TeamService', () => {
  let team: TeamService;

  beforeEach(() => {
    localStorage.clear();
    team = makeService();
  });

  it('começa vazio com 6 slots nulos', () => {
    expect(team.size()).toBe(0);
    expect(team.isEmpty()).toBe(true);
    expect(team.slots()).toHaveLength(MAX_TEAM_SIZE);
    expect(team.slots().every((slot) => slot === null)).toBe(true);
  });

  it('adiciona um Pokémon válido e resolve o resumo', () => {
    expect(team.add(25)).toBe(true);
    expect(team.size()).toBe(1);
    expect(team.members()[0]?.displayName).toBe('Pikachu');
  });

  it('recusa duplicados, ids fora da geração 1 e time cheio', () => {
    expect(team.add(25)).toBe(true);
    expect(team.add(25)).toBe(false);
    expect(team.add(152)).toBe(false);

    for (const id of [1, 4, 7, 10, 13]) {
      expect(team.add(id)).toBe(true);
    }
    expect(team.isFull()).toBe(true);
    expect(team.add(16)).toBe(false);
    expect(team.size()).toBe(MAX_TEAM_SIZE);
  });

  it('remove e limpa', () => {
    team.add(25);
    team.add(6);
    team.remove(25);
    expect(team.memberIds()).toEqual([6]);
    team.clear();
    expect(team.isEmpty()).toBe(true);
  });

  it('reordena os membros', () => {
    team.add(1);
    team.add(4);
    team.add(7);
    team.move(0, 2);
    expect(team.memberIds()).toEqual([4, 7, 1]);
  });

  it('ignora movimentos fora do intervalo', () => {
    team.add(1);
    team.add(4);
    team.move(0, 5);
    team.move(-1, 0);
    expect(team.memberIds()).toEqual([1, 4]);
  });

  it('substitui o time filtrando inválidos, duplicados e excesso', () => {
    team.replace([9, 9, 999, 3, 6, 12, 15, 18, 21]);
    expect(team.memberIds()).toEqual([9, 3, 6, 12, 15, 18]);
  });

  it('persiste no localStorage e recarrega', () => {
    team.add(25);
    team.add(6);
    // Deixa o effect de persistência rodar antes de recriar o serviço.
    TestBed.tick();
    const restored = makeService();
    expect(restored.memberIds()).toEqual([25, 6]);
  });

  it('gera o código de compartilhamento', () => {
    team.replace([25, 6, 9]);
    expect(team.toShareCode()).toBe('25-6-9');
  });
});

describe('parseShareCode', () => {
  it('lê ids separados por hífen', () => {
    expect(parseShareCode('25-6-9')).toEqual([25, 6, 9]);
  });

  it('devolve lista vazia para código ausente ou inválido', () => {
    expect(parseShareCode(null)).toEqual([]);
    expect(parseShareCode('')).toEqual([]);
    expect(parseShareCode('abc-')).toEqual([]);
  });

  it('descarta pedaços que não são números positivos', () => {
    expect(parseShareCode('25-abc-0--6')).toEqual([25, 6]);
  });
});
