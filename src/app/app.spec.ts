import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { TeamService } from './core/services/team.service';

describe('App (shell)', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
  });

  it('renderiza o header com navegação e link para pular o conteúdo', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const html: string = fixture.nativeElement.textContent;
    expect(html).toContain('Pular para o conteúdo');
    expect(html).toContain('Pokédex');
    expect(html).toContain('Meu time');
  });

  it('mostra o contador do time e reage a mudanças', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('0/6');

    TestBed.inject(TeamService).add(25);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1/6');
  });

  it('expõe um alternador de tema com rótulo acessível', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const toggle: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('button[aria-label*="tema"]');
    expect(toggle).not.toBeNull();
    expect(toggle?.getAttribute('aria-label')).toMatch(/tema (claro|escuro)/);
  });
});
