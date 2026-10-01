import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { pokedexNumber } from '../../core/data/sprites';
import type {
  MoveCategory,
  MoveLearnMethod,
  PokemonMove,
  PokemonSummary,
} from '../../core/models/pokemon.model';
import { GameService } from '../../core/services/game.service';
import { PokemonService } from '../../core/services/pokemon.service';
import { filterMoveset, MoveCategoryFilter } from '../../shared/components/move-category-filter';
import { MOVE_METHODS, MoveTable } from '../../shared/components/move-table';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { Icon } from '../../shared/ui/icon';
import { Skeleton } from '../../shared/ui/skeleton';
import { TeamMemberTabs } from './team-member-tabs';

export interface TeamMovesData {
  readonly members: readonly PokemonSummary[];
  /** Membro que abre selecionado. */
  readonly initialId: number;
}

const METHODS = MOVE_METHODS;

/** Ataques que cada membro do time aprende no jogo atual. */
@Component({
  selector: 'app-team-moves-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, Icon, MoveCategoryFilter, MoveTable, Skeleton, TeamMemberTabs],
  host: {
    class:
      'flex max-h-[85vh] w-[min(46rem,94vw)] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'ataques-titulo',
  },
  template: `
    <header class="flex shrink-0 items-center gap-2 border-b border-border p-3">
      <div class="min-w-0 flex-1">
        <h2 id="ataques-titulo" class="text-sm font-semibold">Ataques do time</h2>
        <p class="text-xs text-muted-foreground">Golpes aprendíveis em {{ game.shortTitle }}.</p>
      </div>
      <button
        appButton
        variant="ghost"
        size="icon"
        type="button"
        aria-label="Fechar"
        (click)="close()"
      >
        <app-icon name="x" [size]="18" />
      </button>
    </header>

    <app-team-member-tabs
      [members]="data.members"
      [selectedId]="selected().id"
      (selectedChange)="select($event)"
    />

    <!-- Forma de aprender -->
    <div
      class="flex flex-wrap items-center gap-1 px-3 pt-3"
      role="tablist"
      aria-label="Forma de aprender"
    >
      @for (item of methods; track item.key) {
        <button
          appButton
          size="sm"
          type="button"
          role="tab"
          [variant]="item.key === method() ? 'secondary' : 'ghost'"
          [attr.aria-selected]="item.key === method()"
          (click)="method.set(item.key)"
        >
          {{ item.label }}
          @if (filtered(); as set) {
            <span class="font-mono text-[11px] text-muted-foreground">{{
              set[item.key].length
            }}</span>
          }
        </button>
      }
    </div>

    <app-move-category-filter class="px-3 pt-2" [(value)]="category" />

    <div class="flex-1 overflow-y-auto p-3" aria-live="polite">
      @if (errorMessage(); as message) {
        <div class="flex flex-col items-center gap-3 p-8 text-center text-sm">
          <app-icon name="alert" [size]="20" class="text-negative" />
          <p>{{ message }}</p>
          <button appButton variant="outline" size="sm" type="button" (click)="retry()">
            <app-icon name="refresh" [size]="14" />
            Tentar de novo
          </button>
        </div>
      } @else if (isLoading() || moveset() === undefined) {
        <p class="sr-only">Carregando ataques…</p>
        <div class="flex flex-col gap-2">
          @for (row of skeletonRows; track row) {
            <app-skeleton class="h-10 w-full" />
          }
        </div>
      } @else if (moves().length === 0) {
        <p class="p-8 text-center text-sm text-muted-foreground">
          {{ selected().displayName }} não aprende golpes
          {{ category() === 'all' ? 'dessa forma' : 'dessa forma e categoria' }} em
          {{ game.shortTitle }}.
        </p>
      } @else {
        <app-move-table
          [moves]="moves()"
          [method]="method()"
          [caption]="'Ataques de ' + selected().displayName + ' — ' + methodLabel()"
        />
      }
    </div>

    <footer class="shrink-0 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
      {{ number() }} · descrições em inglês (texto original do jogo).
    </footer>
  `,
})
export class TeamMovesDialog {
  private readonly pokemon = inject(PokemonService);
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  protected readonly data = inject<TeamMovesData>(DIALOG_DATA);
  /** Fixo enquanto o modal está aberto — o jogo não muda por baixo dele. */
  protected readonly game = inject(GameService).current();

  protected readonly methods = METHODS;
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  protected readonly selected = signal<PokemonSummary>(
    this.data.members.find((member) => member.id === this.data.initialId) ?? this.data.members[0]!,
  );
  protected readonly method = signal<MoveLearnMethod>('levelUp');

  private readonly resource = rxResource({
    params: () => this.selected().id,
    stream: ({ params }) => this.pokemon.getMoves(params, this.game.id),
  });

  protected readonly moveset = this.resource.value;
  protected readonly isLoading = this.resource.isLoading;
  /** Filtro de categoria; as contagens das abas seguem ele. */
  protected readonly category = signal<MoveCategory | 'all'>('all');
  protected readonly filtered = computed(() => {
    const moveset = this.moveset();
    return moveset ? filterMoveset(moveset, this.category()) : undefined;
  });
  protected readonly moves = computed<readonly PokemonMove[]>(
    () => this.filtered()?.[this.method()] ?? [],
  );
  protected readonly errorMessage = computed(() => {
    const error = this.resource.error();
    return error instanceof Error ? error.message : undefined;
  });
  protected readonly methodLabel = computed(
    () => METHODS.find((item) => item.key === this.method())?.label ?? '',
  );
  protected readonly number = computed(() => pokedexNumber(this.selected().id));

  protected select(member: PokemonSummary): void {
    this.selected.set(member);
  }

  protected retry(): void {
    this.resource.reload();
  }

  protected close(): void {
    this.ref.close();
  }
}
