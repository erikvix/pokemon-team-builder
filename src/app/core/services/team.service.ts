import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { analyzeTeam, type TeamAnalysis } from './team-analysis';
import { PokemonService } from './pokemon.service';
import type { PokemonSummary } from '../models/pokemon.model';

export const MAX_TEAM_SIZE = 6;
const STORAGE_KEY = 'ptb.team';

/**
 * Estado do time. Hoje persiste em `localStorage`; quando o backend existir,
 * só esta classe muda (os componentes falam com os signals). O formato salvo é
 * a lista de ids, o mínimo necessário para remontar o time.
 */
@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly pokemon = inject(PokemonService);
  private readonly ids = signal<readonly number[]>(readStoredIds());

  /** Ids na ordem escolhida pelo usuário. */
  readonly memberIds = this.ids.asReadonly();

  /** Membros resolvidos, na ordem dos slots. */
  readonly members = computed<readonly PokemonSummary[]>(() =>
    this.pokemon.getSummaries(this.ids()),
  );

  /** Seis posições; `null` é slot vazio. */
  readonly slots = computed<ReadonlyArray<PokemonSummary | null>>(() => {
    const members = this.members();
    return Array.from({ length: MAX_TEAM_SIZE }, (_, index) => members[index] ?? null);
  });

  readonly size = computed(() => this.members().length);
  readonly isFull = computed(() => this.size() >= MAX_TEAM_SIZE);
  readonly isEmpty = computed(() => this.size() === 0);
  readonly analysis = computed<TeamAnalysis>(() => analyzeTeam(this.members()));

  constructor() {
    effect(() => {
      const ids = this.ids();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      } catch {
        /* modo privado ou storage cheio: o time só não sobrevive ao reload */
      }
    });
  }

  has(id: number): boolean {
    return this.ids().includes(id);
  }

  /** Adiciona se houver vaga e o Pokémon ainda não estiver no time. */
  add(id: number): boolean {
    if (this.isFull() || this.has(id) || this.pokemon.getSummary(id) === undefined) {
      return false;
    }
    this.ids.update((ids) => [...ids, id]);
    return true;
  }

  remove(id: number): void {
    this.ids.update((ids) => ids.filter((current) => current !== id));
  }

  clear(): void {
    this.ids.set([]);
  }

  /** Move um membro de posição (drag-and-drop dos slots). */
  move(fromIndex: number, toIndex: number): void {
    this.ids.update((ids) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= ids.length ||
        toIndex >= ids.length
      ) {
        return ids;
      }
      const next = [...ids];
      const [moved] = next.splice(fromIndex, 1);
      if (moved === undefined) {
        return ids;
      }
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  /** Substitui o time inteiro (import por URL). Ignora ids inválidos. */
  replace(ids: readonly number[]): void {
    const valid: number[] = [];
    for (const id of ids) {
      if (valid.length >= MAX_TEAM_SIZE) break;
      if (!valid.includes(id) && this.pokemon.getSummary(id) !== undefined) {
        valid.push(id);
      }
    }
    this.ids.set(valid);
  }

  /** Código compartilhável: ids separados por hífen (`25-6-9`). */
  toShareCode(): string {
    return this.ids().join('-');
  }
}

/** Lê `?time=25-6-9` e devolve os ids; tolera lixo na query string. */
export function parseShareCode(code: string | null): readonly number[] {
  if (!code) {
    return [];
  }
  return code
    .split('-')
    .map((part) => Number.parseInt(part, 10))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function readStoredIds(): readonly number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((value): value is number => typeof value === 'number' && Number.isInteger(value))
      .slice(0, MAX_TEAM_SIZE);
  } catch {
    return [];
  }
}
