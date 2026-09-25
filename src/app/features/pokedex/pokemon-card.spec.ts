import { provideRouter } from '@angular/router';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { PokemonSummary } from '../../core/models/pokemon.model';
import { PokemonCard } from './pokemon-card';

const PIKACHU: PokemonSummary = {
  id: 25,
  name: 'pikachu',
  displayName: 'Pikachu',
  types: ['electric'],
  stats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
  statTotal: 320,
  spriteUrl: 'sprite.png',
  artworkUrl: 'artwork.png',
};

function render(
  inputs: { inTeam?: boolean; teamFull?: boolean } = {},
): ComponentFixture<PokemonCard> {
  const fixture = TestBed.createComponent(PokemonCard);
  fixture.componentRef.setInput('pokemon', PIKACHU);
  fixture.componentRef.setInput('inTeam', inputs.inTeam ?? false);
  fixture.componentRef.setInput('teamFull', inputs.teamFull ?? false);
  fixture.detectChanges();
  return fixture;
}

function addButton(fixture: ComponentFixture<PokemonCard>): HTMLButtonElement {
  const button: HTMLButtonElement | null = fixture.nativeElement.querySelector('button');
  if (!button) {
    throw new Error('botão de adicionar não encontrado');
  }
  return button;
}

describe('PokemonCard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokemonCard],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('mostra número, nome, sprite com dimensões fixas e os tipos', () => {
    const fixture = render();
    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('#025');
    expect(text).toContain('Pikachu');
    expect(text).toContain('Elétrico');

    const img: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('width')).toBe('96');
    expect(img.getAttribute('height')).toBe('96');
    expect(img.alt).toBe('Sprite de Pikachu');
  });

  it('emite o id ao adicionar', () => {
    const fixture = render();
    let emitted: number | undefined;
    fixture.componentInstance.add.subscribe((id) => (emitted = id));
    addButton(fixture).click();
    expect(emitted).toBe(25);
  });

  it('desabilita e explica quando o Pokémon já está no time', () => {
    const button = addButton(render({ inTeam: true }));
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('Pikachu já está no time');
  });

  it('desabilita e explica quando o time está cheio', () => {
    const button = addButton(render({ teamFull: true }));
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-label')).toContain('Time cheio');
  });

  it('descreve a ação quando dá para adicionar', () => {
    const button = addButton(render());
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Adicionar Pikachu ao time');
  });
});
