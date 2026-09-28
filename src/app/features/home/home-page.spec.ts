import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { TeamService } from '../../core/services/team.service';
import { HomePage } from './home-page';

describe('HomePage', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  function render() {
    const fixture = TestBed.createComponent(HomePage);
    fixture.detectChanges();
    return fixture;
  }

  it('mostra FireRed/LeafGreen e HeartGold/SoulSilver', () => {
    const fixture = render();
    const cards = fixture.nativeElement.querySelectorAll('app-game-card');
    expect(cards).toHaveLength(2);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Pokémon FireRed / LeafGreen');
    expect(text).toContain('151 Pokémon · #001–#151');
    expect(text).toContain('Pokémon HeartGold / SoulSilver');
    expect(text).toContain('Johto e Kanto');
  });

  it('leva para a tela do time do jogo clicado', () => {
    const links: HTMLAnchorElement[] = Array.from(
      render().nativeElement.querySelectorAll('app-game-card a'),
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/team?jogo=firered-leafgreen',
      '/team?jogo=heartgold-soulsilver',
    ]);
  });

  it('convida a montar o time quando ele está vazio', () => {
    expect(render().nativeElement.textContent).toContain('Montar time');
  });

  it('convida a continuar e informa o progresso quando já há membros', () => {
    const team = TestBed.inject(TeamService);
    team.add(4);
    team.add(1);

    const text: string = render().nativeElement.textContent;
    expect(text).toContain('Continuar time');
    expect(text).toContain('2 de 6 no time');
    // O time é do jogo atual (FRLG); o card de HGSS continua vazio.
    expect(text).toContain('Montar time');
  });

  it('mantém um atalho para a Pokédex', () => {
    const links: HTMLAnchorElement[] = Array.from(
      render().nativeElement.querySelectorAll('a[href]'),
    );
    expect(links.some((link) => link.getAttribute('href') === '/pokedex')).toBe(true);
  });
});
