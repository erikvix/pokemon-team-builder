import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ptb.theme';

/**
 * Tema claro/escuro. A escolha inicial (e o `class="dark"` antes do primeiro
 * paint) é feita pelo script inline no `index.html`; aqui só mantemos o estado
 * sincronizado com o `<html>` e com o `localStorage`.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly current = signal<Theme>(initialTheme());

  readonly theme = this.current.asReadonly();

  constructor() {
    effect(() => {
      const theme = this.current();
      document.documentElement.classList.toggle('dark', theme === 'dark');
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* sem persistência: o tema volta ao padrão do sistema no próximo load */
      }
    });
  }

  toggle(): void {
    this.current.update((theme) => (theme === 'dark' ? 'light' : 'dark'));
  }

  set(theme: Theme): void {
    this.current.set(theme);
  }
}

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
  } catch {
    /* ignora storage indisponível */
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}
