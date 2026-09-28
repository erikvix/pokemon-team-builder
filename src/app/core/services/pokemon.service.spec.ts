import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PokemonDataError, PokemonService } from './pokemon.service';

const FRLG = 'firered-leafgreen';
const HGSS = 'heartgold-soulsilver';

function makeService(): PokemonService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideHttpClient()] });
  return TestBed.inject(PokemonService);
}

describe('PokemonService.getMoves', () => {
  it('traz os golpes do Pikachu em FireRed/LeafGreen, agrupados', async () => {
    const moves = await firstValueFrom(makeService().getMoves(25, FRLG));

    const thunderbolt = moves.levelUp.find((move) => move.name === 'thunderbolt');
    expect(thunderbolt).toMatchObject({
      displayName: 'Thunderbolt',
      type: 'electric',
      category: 'special',
      // 95 até a geração 5 — o índice usa o valor do jogo, não o atual.
      power: 95,
      level: 26,
    });
    expect(moves.machine.some((move) => move.machine === 'TM24')).toBe(true);
    expect(moves.tutor.length).toBeGreaterThan(0);
  });

  it('usa a categoria da geração 3, que vem do tipo', async () => {
    const moves = await firstValueFrom(makeService().getMoves(9, FRLG));
    // Bite é Sombrio e, portanto, especial em FRLG.
    expect(moves.levelUp.find((move) => move.name === 'bite')?.category).toBe('special');
  });

  it('ordena as máquinas com TMs antes de HMs', async () => {
    const machines = (await firstValueFrom(makeService().getMoves(6, FRLG))).machine.map(
      (move) => move.machine ?? '',
    );
    const firstHm = machines.findIndex((machine) => machine.startsWith('HM'));
    expect(firstHm).toBeGreaterThan(0);
    expect(machines.slice(firstHm).every((machine) => machine.startsWith('HM'))).toBe(true);
    expect(machines[0]).toBe('TM01');
  });

  it('falha com erro de domínio para ids fora do jogo', async () => {
    await expect(firstValueFrom(makeService().getMoves(999, FRLG))).rejects.toBeInstanceOf(
      PokemonDataError,
    );
  });
});

describe('PokemonService.getEncounters', () => {
  it('traz os locais do Pikachu em FireRed/LeafGreen', async () => {
    const encounters = await firstValueFrom(makeService().getEncounters(25, FRLG));
    expect(encounters.some((row) => row.area === 'Viridian Forest' && row.method === 'walk')).toBe(
      true,
    );
    expect(encounters.every((row) => row.minLevel <= row.maxLevel)).toBe(true);
  });

  it('marca exclusivos de versão (Ekans só em FireRed)', async () => {
    const encounters = await firstValueFrom(makeService().getEncounters(23, FRLG));
    expect(encounters.length).toBeGreaterThan(0);
    expect(encounters.every((row) => row.versions === 'firered')).toBe(true);
  });

  it('inclui presentes e encontros fixos, e fica vazio para quem só evolui', async () => {
    const service = makeService();
    const eevee = await firstValueFrom(service.getEncounters(133, FRLG));
    expect(eevee.map((row) => row.method)).toContain('gift');
    const mewtwo = await firstValueFrom(service.getEncounters(150, FRLG));
    expect(mewtwo.map((row) => row.method)).toContain('static');
    expect(await firstValueFrom(service.getEncounters(3, FRLG))).toEqual([]);
  });

  it('falha com erro de domínio para ids fora do jogo', async () => {
    await expect(firstValueFrom(makeService().getEncounters(999, FRLG))).rejects.toBeInstanceOf(
      PokemonDataError,
    );
  });
});

describe('PokemonService por jogo', () => {
  it('lista só os Pokémon de cada jogo', () => {
    const service = makeService();
    const frlg = service.listSync(FRLG);
    const hgss = service.listSync(HGSS);
    expect(frlg).toHaveLength(151);
    expect(frlg.at(-1)?.name).toBe('mew');
    // Chikorita e Ho-Oh só existem em HGSS; Leafeon (evolui num local de Sinnoh) em nenhum.
    expect(hgss.some((pokemon) => pokemon.id === 152)).toBe(true);
    expect(hgss.some((pokemon) => pokemon.id === 250)).toBe(true);
    expect(frlg.some((pokemon) => pokemon.id === 152)).toBe(false);
    expect(hgss.some((pokemon) => pokemon.id === 470)).toBe(false);
  });

  it('deixa fora de HGSS quem só vem por troca ou evento', () => {
    const hgss = new Set(
      makeService()
        .listSync(HGSS)
        .map((pokemon) => pokemon.id),
    );
    // Kyogre e Groudon se pegam (um em cada versão); Rayquaza precisa dos dois.
    expect(hgss.has(382)).toBe(true);
    expect(hgss.has(383)).toBe(true);
    expect(hgss.has(384)).toBe(false);
    // Dialga, Palkia e Giratina só com o Arceus de evento.
    expect([483, 484, 487].some((id) => hgss.has(id))).toBe(false);
    // Iniciais de Hoenn são presente do Steven — entram.
    expect(hgss.has(252)).toBe(true);
  });

  it('usa a categoria da geração 4 em HGSS, que vem do golpe', async () => {
    const moves = await firstValueFrom(makeService().getMoves(9, HGSS));
    // Bite: especial em FRLG (Sombrio), físico em HGSS.
    expect(moves.levelUp.find((move) => move.name === 'bite')?.category).toBe('physical');
  });

  it('traz condições de horário nos locais de HGSS (Hoothoot à noite)', async () => {
    const encounters = await firstValueFrom(makeService().getEncounters(163, HGSS));
    const route29 = encounters.find((row) => row.area === 'Route 29' && row.method === 'walk');
    expect(route29?.conditions).toEqual(['night']);
  });

  it('não serve ataques de um Pokémon que não está no jogo', async () => {
    await expect(firstValueFrom(makeService().getMoves(152, FRLG))).rejects.toBeInstanceOf(
      PokemonDataError,
    );
  });
});
