import { Injectable, computed, effect, signal } from '@angular/core';
import { DEFAULT_GAME_ID, GAMES, findGame, type Game, type GameId } from '../data/games';

const STORAGE_KEY = 'ptb.game';

/**
 * Jogo escolhido na tela inicial. Pokédex, time, ataques e locais seguem ele;
 * fica salvo para o próximo acesso abrir no mesmo jogo.
 */
@Injectable({ providedIn: 'root' })
export class GameService {
  private readonly currentId = signal<GameId>(readStoredId());

  readonly games = GAMES;
  readonly current = computed<Game>(() => findGame(this.currentId()) ?? GAMES[0]!);

  /** Ids do jogo atual, para checagem rápida. */
  readonly pokemonIds = computed<ReadonlySet<number>>(() => new Set(this.current().pokemonIds));

  constructor() {
    effect(() => {
      const id = this.currentId();
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* modo privado: o jogo só não sobrevive ao reload */
      }
    });
  }

  /** Troca o jogo atual. Ids desconhecidos são ignorados. */
  select(id: string): boolean {
    const game = findGame(id);
    if (!game) {
      return false;
    }
    this.currentId.set(game.id);
    return true;
  }

  has(pokemonId: number): boolean {
    return this.pokemonIds().has(pokemonId);
  }
}

function readStoredId(): GameId {
  try {
    return findGame(localStorage.getItem(STORAGE_KEY))?.id ?? DEFAULT_GAME_ID;
  } catch {
    return DEFAULT_GAME_ID;
  }
}
