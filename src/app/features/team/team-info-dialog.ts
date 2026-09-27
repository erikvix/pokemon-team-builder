import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { pokedexNumber } from '../../core/data/sprites';
import {
  STAT_KEYS,
  type EncounterMethod,
  type EvolutionStage,
  type GameVersions,
  type PokemonSummary,
} from '../../core/models/pokemon.model';
import { PokemonService } from '../../core/services/pokemon.service';
import { StatBar } from '../../shared/components/stat-bar';
import { TypeBadge } from '../../shared/components/type-badge';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { Icon } from '../../shared/ui/icon';
import { Skeleton } from '../../shared/ui/skeleton';
import { TeamMemberTabs } from './team-member-tabs';

export interface TeamInfoData {
  readonly members: readonly PokemonSummary[];
  /** Membro que abre selecionado. */
  readonly initialId: number;
}

const LAST_GEN1_ID = 151;

const METHOD_LABEL: Readonly<Record<EncounterMethod, string>> = {
  walk: 'Grama / caverna',
  'old-rod': 'Old Rod',
  'good-rod': 'Good Rod',
  'super-rod': 'Super Rod',
  surf: 'Surf',
  'rock-smash': 'Rock Smash',
  gift: 'Presente',
  'gift-egg': 'Ovo de presente',
  static: 'Encontro fixo',
  pokeflute: 'Poké Flute',
  'npc-trade': 'Troca com NPC',
  'roaming-grass': 'Errante',
};

/** Métodos sem sorteio — a chance não significa nada para eles. */
const GUARANTEED: ReadonlySet<EncounterMethod> = new Set([
  'gift',
  'gift-egg',
  'static',
  'pokeflute',
  'npc-trade',
]);

const VERSION_LABEL: Readonly<Record<GameVersions, string>> = {
  both: 'FR / LG',
  firered: 'Só FireRed',
  leafgreen: 'Só LeafGreen',
};

/** Ficha de um membro do time: base stats, linha evolutiva e onde encontrar no jogo. */
@Component({
  selector: 'app-team-info-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, Icon, Skeleton, StatBar, TeamMemberTabs, TypeBadge],
  host: {
    class:
      'flex max-h-[85vh] w-[min(40rem,94vw)] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'ficha-titulo',
  },
  template: `
    <header class="flex shrink-0 items-center gap-3 border-b border-border p-3">
      <img
        [src]="selected().spriteUrl"
        alt=""
        width="56"
        height="56"
        decoding="async"
        class="size-14 shrink-0 [image-rendering:pixelated]"
      />
      <div class="min-w-0 flex-1">
        <h2 id="ficha-titulo" class="flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
          {{ selected().displayName }}
          <span class="font-mono text-xs font-normal text-muted-foreground">{{ number() }}</span>
        </h2>
        <div class="mt-1 flex flex-wrap gap-1">
          @for (type of selected().types; track type) {
            <app-type-badge [type]="type" size="sm" />
          }
        </div>
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

    @if (data.members.length > 1) {
      <app-team-member-tabs
        [members]="data.members"
        [selectedId]="selected().id"
        (selectedChange)="selected.set($event)"
      />
    }

    <div class="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
      <!-- Base stats -->
      <section class="flex flex-col gap-2" aria-labelledby="ficha-stats">
        <div class="flex items-baseline justify-between">
          <h3 id="ficha-stats" class="text-sm font-semibold">Base stats</h3>
          <p class="text-xs text-muted-foreground">
            Total
            <span class="font-mono font-medium text-foreground">{{ selected().statTotal }}</span>
          </p>
        </div>
        <dl class="flex flex-col gap-1.5">
          @for (key of statKeys; track key) {
            <app-stat-bar [stat]="key" [value]="selected().stats[key]" />
          }
        </dl>
      </section>

      <!-- Linha evolutiva -->
      <section class="flex flex-col gap-2" aria-labelledby="ficha-evolucao">
        <h3 id="ficha-evolucao" class="text-sm font-semibold">Evolução</h3>
        @if (detailError(); as message) {
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <app-icon name="alert" [size]="16" class="text-negative" />
            <span>{{ message }}</span>
            <button appButton variant="outline" size="sm" type="button" (click)="retryDetail()">
              <app-icon name="refresh" [size]="14" />
              Tentar de novo
            </button>
          </div>
        } @else if (detail.isLoading() || !detail.hasValue()) {
          <p class="sr-only">Carregando evolução…</p>
          <app-skeleton class="h-14 w-full" />
        } @else if (evolutionStages().length <= 1) {
          <p class="text-sm text-muted-foreground">{{ selected().displayName }} não evolui.</p>
        } @else {
          <ol class="flex flex-wrap items-center gap-2">
            @for (stage of evolutionStages(); track $index; let last = $last, firstStage = $first) {
              <li class="flex flex-col gap-1.5">
                @for (form of stage; track form.id) {
                  <div
                    class="flex items-center gap-2 rounded-md border border-border px-2 py-1"
                    [class.bg-accent]="form.id === selected().id"
                    [attr.aria-current]="form.id === selected().id ? 'true' : null"
                  >
                    <img
                      [src]="form.spriteUrl"
                      alt=""
                      width="40"
                      height="40"
                      loading="lazy"
                      decoding="async"
                      class="size-10 [image-rendering:pixelated]"
                    />
                    <span class="flex flex-col">
                      <span class="text-sm font-medium">{{ form.displayName }}</span>
                      @if (form.trigger) {
                        <span class="text-[11px] text-muted-foreground">{{ form.trigger }}</span>
                      } @else if (firstStage) {
                        <span class="text-[11px] text-muted-foreground">Forma base</span>
                      }
                    </span>
                  </div>
                }
              </li>
              @if (!last) {
                <li aria-hidden="true" class="text-muted-foreground">
                  <app-icon name="chevronRight" [size]="16" />
                </li>
              }
            }
          </ol>
        }
      </section>

      <!-- Onde encontrar -->
      <section class="flex flex-col gap-2" aria-labelledby="ficha-locais">
        <div>
          <h3 id="ficha-locais" class="text-sm font-semibold">Onde encontrar</h3>
          <p class="text-xs text-muted-foreground">Em FireRed / LeafGreen.</p>
        </div>
        @if (encountersError(); as message) {
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <app-icon name="alert" [size]="16" class="text-negative" />
            <span>{{ message }}</span>
            <button appButton variant="outline" size="sm" type="button" (click)="retryEncounters()">
              <app-icon name="refresh" [size]="14" />
              Tentar de novo
            </button>
          </div>
        } @else if (encounters.isLoading() || !encounters.hasValue()) {
          <p class="sr-only">Carregando locais…</p>
          <div class="flex flex-col gap-2">
            <app-skeleton class="h-8 w-full" />
            <app-skeleton class="h-8 w-full" />
          </div>
        } @else if (encounterList().length === 0) {
          <p
            class="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground"
          >
            Não aparece na natureza.
            @if (evolvesFrom(); as from) {
              Evolua um
              <span class="font-medium text-foreground">{{ from.displayName }}</span>
              @if (selectedTrigger(); as trigger) {
                ({{ trigger }})
              }
              para conseguir.
            } @else {
              Só é obtido por evento ou troca com outro jogo.
            }
          </p>
        } @else {
          <table class="w-full border-collapse text-sm">
            <caption class="sr-only">
              Onde encontrar
              {{
                selected().displayName
              }}
              em FireRed e LeafGreen
            </caption>
            <thead>
              <tr class="border-b border-border text-left text-xs text-muted-foreground">
                <th scope="col" class="py-2 pr-2 font-medium">Local</th>
                <th scope="col" class="w-16 py-2 pr-2 text-right font-medium">Nível</th>
                <th scope="col" class="w-14 py-2 text-right font-medium">Chance</th>
              </tr>
            </thead>
            <tbody>
              @for (row of encounterList(); track $index) {
                <tr class="border-b border-border/60 align-top last:border-0">
                  <td class="py-2 pr-2">
                    <span class="font-medium">{{ row.area }}</span>
                    <span
                      class="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground"
                    >
                      {{ methodLabel[row.method] }}
                      @if (row.versions !== 'both') {
                        <span
                          class="rounded border px-1 font-medium text-foreground"
                          [style.border-color]="versionColor(row.versions)"
                          >{{ versionLabel[row.versions] }}</span
                        >
                      }
                    </span>
                  </td>
                  <td class="py-2 pr-2 text-right font-mono text-xs">
                    {{
                      row.minLevel === row.maxLevel
                        ? row.minLevel
                        : row.minLevel + '–' + row.maxLevel
                    }}
                  </td>
                  <td class="py-2 text-right font-mono text-xs">
                    {{ guaranteed.has(row.method) ? '—' : row.chance + '%' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </div>

    <footer
      class="flex shrink-0 items-center justify-between gap-2 border-t border-border px-3 py-2"
    >
      <p class="text-[11px] text-muted-foreground">Nomes de locais em inglês, como no jogo.</p>
      <button appButton variant="outline" size="sm" type="button" (click)="openPage()">
        Página completa
        <app-icon name="chevronRight" [size]="14" />
      </button>
    </footer>
  `,
})
export class TeamInfoDialog {
  private readonly pokemon = inject(PokemonService);
  private readonly router = inject(Router);
  private readonly ref = inject<DialogRef<void>>(DialogRef);
  protected readonly data = inject<TeamInfoData>(DIALOG_DATA);

  protected readonly statKeys = STAT_KEYS;
  protected readonly methodLabel = METHOD_LABEL;
  protected readonly versionLabel = VERSION_LABEL;
  protected readonly guaranteed = GUARANTEED;

  protected readonly selected = signal<PokemonSummary>(
    this.data.members.find((member) => member.id === this.data.initialId) ?? this.data.members[0]!,
  );
  protected readonly number = computed(() => pokedexNumber(this.selected().id));

  /** Evolução vem do detalhe ao vivo (com cache), o mesmo da página do Pokémon. */
  protected readonly detail = rxResource({
    params: () => this.selected().id,
    stream: ({ params }) => this.pokemon.getDetail(params),
  });
  protected readonly encounters = rxResource({
    params: () => this.selected().id,
    stream: ({ params }) => this.pokemon.getEncounters(params),
  });

  protected readonly detailError = computed(() => errorMessage(this.detail.error()));
  protected readonly encountersError = computed(() => errorMessage(this.encounters.error()));
  protected readonly encounterList = computed(() => this.encounters.value() ?? []);

  /** Só a geração 1: Pichu, Crobat, Espeon e cia. não existem em FRLG sem troca. */
  private readonly evolutionLine = computed<readonly EvolutionStage[]>(() =>
    (this.detail.value()?.evolutionLine ?? []).filter((stage) => stage.id <= LAST_GEN1_ID),
  );

  protected readonly evolutionStages = computed<ReadonlyArray<readonly EvolutionStage[]>>(() => {
    const byStage = new Map<number, EvolutionStage[]>();
    for (const stage of this.evolutionLine()) {
      const bucket = byStage.get(stage.stage) ?? [];
      bucket.push(stage);
      byStage.set(stage.stage, bucket);
    }
    return [...byStage.entries()].sort(([a], [b]) => a - b).map(([, stages]) => stages);
  });

  /** Estágio anterior ao selecionado — para dizer de quem ele evolui. */
  protected readonly evolvesFrom = computed<EvolutionStage | undefined>(() => {
    const line = this.evolutionLine();
    const current = line.find((stage) => stage.id === this.selected().id);
    if (!current) {
      return undefined;
    }
    return line.find((stage) => stage.stage === current.stage - 1);
  });

  protected readonly selectedTrigger = computed(
    () => this.evolutionLine().find((stage) => stage.id === this.selected().id)?.trigger ?? null,
  );

  /** Borda na cor da capa: Fogo para FireRed, Planta para LeafGreen. */
  protected versionColor(versions: GameVersions): string {
    const type = versions === 'firered' ? 'fire' : 'grass';
    return `color-mix(in oklab, var(--type-${type}) 60%, transparent)`;
  }

  protected retryDetail(): void {
    this.detail.reload();
  }

  protected retryEncounters(): void {
    this.encounters.reload();
  }

  protected openPage(): void {
    this.ref.close();
    void this.router.navigate(['/pokemon', this.selected().id]);
  }

  protected close(): void {
    this.ref.close();
  }
}

function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}
