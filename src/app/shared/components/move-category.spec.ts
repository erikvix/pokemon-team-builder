import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { PokemonMove, PokemonMoveset } from '../../core/models/pokemon.model';
import { filterMoveset } from './move-category-filter';
import { MoveTable } from './move-table';

function move(name: string, category: PokemonMove['category']): PokemonMove {
  return {
    name,
    displayName: name,
    type: 'normal',
    category,
    power: null,
    accuracy: null,
    pp: 10,
    description: null,
    level: 1,
    machine: null,
  };
}

const MOVESET: PokemonMoveset = {
  levelUp: [move('tackle', 'physical'), move('growl', 'status'), move('ember', 'special')],
  machine: [move('toxic', 'status')],
  tutor: [],
  egg: [move('bite', 'special')],
};

describe('filterMoveset', () => {
  it('devolve o moveset inteiro em "all"', () => {
    expect(filterMoveset(MOVESET, 'all')).toBe(MOVESET);
  });

  it('filtra as quatro listas pela categoria', () => {
    const special = filterMoveset(MOVESET, 'special');
    expect(special.levelUp.map((m) => m.name)).toEqual(['ember']);
    expect(special.machine).toEqual([]);
    expect(special.egg.map((m) => m.name)).toEqual(['bite']);
  });
});

describe('MoveTable', () => {
  it('mostra a categoria com ícone e nome', () => {
    const fixture = TestBed.createComponent(MoveTable);
    fixture.componentRef.setInput('moves', MOVESET.levelUp);
    fixture.componentRef.setInput('method', 'levelUp');
    fixture.componentRef.setInput('caption', 'teste');
    fixture.detectChanges();

    const all: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('td app-move-category-badge'),
    );
    // Um selo na coluna (desktop) e outro junto do nome, só no mobile.
    const mobile = all.filter((badge) => badge.classList.contains('sm:hidden'));
    const badges = all.filter((badge) => !badge.classList.contains('sm:hidden'));
    expect(mobile).toHaveLength(3);
    expect(badges.map((badge) => badge.textContent?.trim())).toEqual([
      'Físico',
      'Status',
      'Especial',
    ]);
    expect(badges.every((badge) => badge.querySelector('svg') !== null)).toBe(true);
  });
});
