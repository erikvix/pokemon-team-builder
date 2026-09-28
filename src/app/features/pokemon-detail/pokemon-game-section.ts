import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { GAMES, type Game, type GameId } from '../../core/data/games';
import type { MoveLearnMethod } from '../../core/models/pokemon.model';
import { GameService } from '../../core/services/game.service';
import { PokemonService } from '../../core/services/pokemon.service';
import { EncounterTable } from '../../shared/components/encounter-table';
import { MOVE_METHODS, MoveTable } from '../../shared/components/move-table';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { CardDirective } from '../../shared/ui/card.directive';
import { Icon } from '../../shared/ui/icon';
import { Skeleton } from '../../shared/ui/skeleton';

/**
 * O Pokémon em cada jogo em que ele existe: habilidades, onde encontrar e
 * ataques, com abas por jogo — no molde da ficha do pokemondb.net. Abre no
 * jogo atual quando o Pokémon existe nele.
 */
@Component({
  selector: 'app-pokemon-game-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonDirective,
    CardDirective,
    EncounterTable,
    Icon,
    MoveTable,
    NgTemplateOutlet,
    Skeleton,
  ],
  template: `
    <section appCard class="flex flex-col gap-4 p-5" aria-labelledby="nos-jogos">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 id="nos-jogos" class="text-sm font-semibold">Nos jogos</h2>
        @if (games().length > 1) {
          <div class="flex flex-wrap gap-1" role="tablist" aria-label="Jogo">
            @for (item of games(); track item.id) {
              <button
                appButton
                size="sm"
                type="button"
                role="tab"
                [variant]="item.id === game()?.id ? 'secondary' : 'ghost'"
                [attr.aria-selected]="item.id === game()?.id"
                (click)="selectedId.set(item.id)"
              >
                {{ item.shortTitle }}
              </button>
            }
          </div>
        } @else if (game(); as only) {
          <p class="text-xs text-muted-foreground">{{ only.shortTitle }}</p>
        }
      </div>

      @if (game(); as current) {
        <!-- Habilidades -->
        <div class="flex flex-col gap-2">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Habilidades
          </h3>
          @if (abilities.error()) {
            <ng-container *ngTemplateOutlet="failed; context: { retry: abilities }" />
          } @else if (abilities.value(); as list) {
            <ol class="flex flex-col gap-1.5 text-sm">
              @for (ability of list; track ability.name; let i = $index) {
                <li class="flex gap-2">
                  <span class="w-4 shrink-0 font-mono text-xs text-muted-foreground">{{
                    i + 1
                  }}</span>
                  <span>
                    <span class="font-medium">{{ ability.displayName }}</span>
                    @if (ability.description) {
                      <span class="text-muted-foreground"> — {{ ability.description }}</span>
                    }
                  </span>
                </li>
              }
            </ol>
          } @else {
            <app-skeleton class="h-10 w-full" />
          }
        </div>

        <!-- Onde encontrar -->
        <div class="flex flex-col gap-2">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Onde encontrar
          </h3>
          @if (encounters.error()) {
            <ng-container *ngTemplateOutlet="failed; context: { retry: encounters }" />
          } @else if (encounters.value(); as rows) {
            @if (rows.length === 0) {
              <p
                class="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground"
              >
                Não aparece na natureza em {{ current.shortTitle }} — vem por evolução, reprodução
                ou troca.
              </p>
            } @else {
              <app-encounter-table
                [encounters]="rows"
                [game]="current"
                [caption]="'Onde encontrar ' + displayName() + ' em ' + current.shortTitle"
              />
            }
          } @else {
            <app-skeleton class="h-16 w-full" />
          }
        </div>

        <!-- Ataques -->
        <div class="flex flex-col gap-2">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Ataques
          </h3>
          @if (moves.error()) {
            <ng-container *ngTemplateOutlet="failed; context: { retry: moves }" />
          } @else if (moves.value(); as moveset) {
            <div class="grid gap-x-6 gap-y-4 xl:grid-cols-2">
              @for (item of methods; track item.key) {
                @if (moveset[item.key]; as list) {
                  @if (list.length > 0) {
                    <div class="min-w-0">
                      <h4 class="flex items-baseline gap-2 text-sm font-medium">
                        {{ item.label }}
                        <span class="font-mono text-[11px] text-muted-foreground">{{
                          list.length
                        }}</span>
                      </h4>
                      <app-move-table
                        [moves]="list"
                        [method]="item.key"
                        [showDescriptions]="false"
                        [caption]="displayName() + ' em ' + current.shortTitle + ' — ' + item.label"
                      />
                    </div>
                  }
                }
              }
            </div>
          } @else {
            <app-skeleton class="h-40 w-full" />
          }
        </div>

        <p class="text-[11px] text-muted-foreground">
          Dados de {{ current.shortTitle }}: habilidades sem as ocultas (só vieram na geração 5),
          golpes com poder e precisão daquele jogo. Nomes e descrições em inglês, como no jogo.
        </p>
      } @else {
        <p class="text-sm text-muted-foreground">
          {{ displayName() }} não aparece em nenhum dos jogos do app sem troca ou evento.
        </p>
      }
    </section>

    <ng-template #failed let-retry="retry">
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <app-icon name="alert" [size]="16" class="text-negative" />
        <span>Não foi possível carregar.</span>
        <button appButton variant="outline" size="sm" type="button" (click)="retry.reload()">
          <app-icon name="refresh" [size]="14" />
          Tentar de novo
        </button>
      </div>
    </ng-template>
  `,
  host: { class: 'block' },
})
export class PokemonGameSection {
  private readonly pokemon = inject(PokemonService);
  private readonly gameService = inject(GameService);

  readonly pokemonId = input.required<number>();
  readonly displayName = input.required<string>();

  protected readonly methods: ReadonlyArray<{ key: MoveLearnMethod; label: string }> = MOVE_METHODS;

  /** Jogos em que o Pokémon existe, na ordem da tela inicial. */
  protected readonly games = computed<readonly Game[]>(() =>
    GAMES.filter((game) => game.pokemonIds.includes(this.pokemonId())),
  );

  /** Aba escolhida; volta a `null` (jogo atual) quando se navega para outro Pokémon. */
  protected readonly selectedId = linkedSignal<number, GameId | null>({
    source: this.pokemonId,
    computation: () => null,
  });

  /** O escolhido na aba; senão o jogo atual, se o Pokémon existir nele; senão o primeiro. */
  protected readonly game = computed<Game | undefined>(() => {
    const games = this.games();
    const wanted = this.selectedId() ?? this.gameService.current().id;
    return games.find((game) => game.id === wanted) ?? games[0];
  });

  private readonly params = computed(() => {
    const game = this.game();
    return game ? { id: this.pokemonId(), gameId: game.id } : undefined;
  });

  protected readonly abilities = rxResource({
    params: this.params,
    stream: ({ params }) => this.pokemon.getAbilities(params.id, params.gameId),
  });
  protected readonly encounters = rxResource({
    params: this.params,
    stream: ({ params }) => this.pokemon.getEncounters(params.id, params.gameId),
  });
  protected readonly moves = rxResource({
    params: this.params,
    stream: ({ params }) => this.pokemon.getMoves(params.id, params.gameId),
  });
}
