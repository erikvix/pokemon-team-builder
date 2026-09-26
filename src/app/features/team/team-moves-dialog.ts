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
import { PokemonService } from '../../core/services/pokemon.service';
import { TypeBadge } from '../../shared/components/type-badge';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { Icon } from '../../shared/ui/icon';
import { Skeleton } from '../../shared/ui/skeleton';
import { cn } from '../../shared/ui/cn';

export interface TeamMovesData {
  readonly members: readonly PokemonSummary[];
  /** Membro que abre selecionado. */
  readonly initialId: number;
}

const METHODS: ReadonlyArray<{ readonly key: MoveLearnMethod; readonly label: string }> = [
  { key: 'levelUp', label: 'Por nível' },
  { key: 'machine', label: 'TM / HM' },
  { key: 'tutor', label: 'Tutor' },
  { key: 'egg', label: 'Ovo' },
];

const CATEGORY_LABEL: Readonly<Record<MoveCategory, string>> = {
  physical: 'Físico',
  special: 'Especial',
  status: 'Status',
};

/** Ataques que cada membro do time aprende em FireRed/LeafGreen. */
@Component({
  selector: 'app-team-moves-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, Icon, Skeleton, TypeBadge],
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
        <p class="text-xs text-muted-foreground">Golpes aprendíveis em FireRed / LeafGreen.</p>
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

    <!-- Membros -->
    <div
      class="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2"
      role="tablist"
      aria-label="Membro do time"
    >
      @for (member of data.members; track member.id) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="member.id === selected().id"
          [class]="memberTabClass(member.id === selected().id)"
          (click)="select(member)"
        >
          <img
            [src]="member.spriteUrl"
            alt=""
            width="40"
            height="40"
            decoding="async"
            class="size-10 shrink-0 [image-rendering:pixelated]"
          />
          <span class="text-xs font-medium">{{ member.displayName }}</span>
        </button>
      }
    </div>

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
          @if (moveset(); as set) {
            <span class="font-mono text-[11px] text-muted-foreground">{{
              set[item.key].length
            }}</span>
          }
        </button>
      }
    </div>

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
          {{ selected().displayName }} não aprende golpes dessa forma em FireRed / LeafGreen.
        </p>
      } @else {
        <table class="w-full border-collapse text-sm">
          <caption class="sr-only">
            Ataques de
            {{
              selected().displayName
            }}
            —
            {{
              methodLabel()
            }}
          </caption>
          <thead>
            <tr class="border-b border-border text-left text-xs text-muted-foreground">
              @if (method() === 'levelUp' || method() === 'machine') {
                <th scope="col" class="w-12 py-2 pr-2 font-medium">
                  {{ method() === 'levelUp' ? 'Nv.' : 'Máq.' }}
                </th>
              }
              <th scope="col" class="py-2 pr-2 font-medium">Golpe</th>
              <th scope="col" class="hidden py-2 pr-2 font-medium sm:table-cell">Categoria</th>
              <th scope="col" class="w-12 py-2 pr-2 text-right font-medium">
                <abbr title="Poder" class="no-underline">Pod.</abbr>
              </th>
              <th scope="col" class="w-12 py-2 pr-2 text-right font-medium">
                <abbr title="Precisão" class="no-underline">Prec.</abbr>
              </th>
              <th scope="col" class="w-10 py-2 text-right font-medium">PP</th>
            </tr>
          </thead>
          <tbody>
            @for (move of moves(); track $index) {
              <tr class="border-b border-border/60 align-top last:border-0">
                @if (method() === 'levelUp') {
                  <td class="py-2 pr-2 font-mono text-xs text-muted-foreground">
                    {{ move.level === 1 ? 'Início' : move.level }}
                  </td>
                } @else if (method() === 'machine') {
                  <td class="py-2 pr-2 font-mono text-xs text-muted-foreground">
                    {{ move.machine }}
                  </td>
                }
                <td class="py-2 pr-2">
                  <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span class="font-medium">{{ move.displayName }}</span>
                    @if (move.type; as type) {
                      <app-type-badge [type]="type" size="sm" />
                    } @else {
                      <span
                        class="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium"
                        >???</span
                      >
                    }
                    <span class="text-[11px] text-muted-foreground sm:hidden">
                      {{ categoryLabel[move.category] }}
                    </span>
                  </div>
                  @if (move.description) {
                    <p class="mt-0.5 text-xs text-muted-foreground">{{ move.description }}</p>
                  }
                </td>
                <td class="hidden py-2 pr-2 text-xs sm:table-cell">
                  {{ categoryLabel[move.category] }}
                </td>
                <td class="py-2 pr-2 text-right font-mono text-xs">{{ move.power ?? '—' }}</td>
                <td class="py-2 pr-2 text-right font-mono text-xs">
                  {{ move.accuracy ?? '—' }}
                </td>
                <td class="py-2 text-right font-mono text-xs">{{ move.pp ?? '—' }}</td>
              </tr>
            }
          </tbody>
        </table>
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

  protected readonly methods = METHODS;
  protected readonly categoryLabel = CATEGORY_LABEL;
  protected readonly skeletonRows = [0, 1, 2, 3, 4, 5];

  protected readonly selected = signal<PokemonSummary>(
    this.data.members.find((member) => member.id === this.data.initialId) ?? this.data.members[0]!,
  );
  protected readonly method = signal<MoveLearnMethod>('levelUp');

  private readonly resource = rxResource({
    params: () => this.selected().id,
    stream: ({ params }) => this.pokemon.getMoves(params),
  });

  protected readonly moveset = this.resource.value;
  protected readonly isLoading = this.resource.isLoading;
  protected readonly moves = computed<readonly PokemonMove[]>(
    () => this.moveset()?.[this.method()] ?? [],
  );
  protected readonly errorMessage = computed(() => {
    const error = this.resource.error();
    return error instanceof Error ? error.message : undefined;
  });
  protected readonly methodLabel = computed(
    () => METHODS.find((item) => item.key === this.method())?.label ?? '',
  );
  protected readonly number = computed(() => pokedexNumber(this.selected().id));

  protected memberTabClass(active: boolean): string {
    return cn(
      'flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1 transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]',
      active && 'bg-accent ring-1 ring-border',
    );
  }

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
