import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { PokemonDataError, PokemonService } from './pokemon.service';

function makeService(): PokemonService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideHttpClient()] });
  return TestBed.inject(PokemonService);
}

describe('PokemonService.getMoves', () => {
  it('traz os golpes do Pikachu em FireRed/LeafGreen, agrupados', async () => {
    const moves = await firstValueFrom(makeService().getMoves(25));

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
    const moves = await firstValueFrom(makeService().getMoves(9));
    // Bite é Sombrio e, portanto, especial em FRLG.
    expect(moves.levelUp.find((move) => move.name === 'bite')?.category).toBe('special');
  });

  it('ordena as máquinas com TMs antes de HMs', async () => {
    const machines = (await firstValueFrom(makeService().getMoves(6))).machine.map(
      (move) => move.machine ?? '',
    );
    const firstHm = machines.findIndex((machine) => machine.startsWith('HM'));
    expect(firstHm).toBeGreaterThan(0);
    expect(machines.slice(firstHm).every((machine) => machine.startsWith('HM'))).toBe(true);
    expect(machines[0]).toBe('TM01');
  });

  it('falha com erro de domínio para ids fora da geração 1', async () => {
    await expect(firstValueFrom(makeService().getMoves(999))).rejects.toBeInstanceOf(
      PokemonDataError,
    );
  });
});
