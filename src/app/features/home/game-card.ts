import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { typeColorVar } from '../../core/data/pokemon-types';
import { pokedexNumber } from '../../core/data/sprites';
import { MAX_TEAM_SIZE } from '../../core/services/team.service';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { CardDirective } from '../../shared/ui/card.directive';
import { Icon } from '../../shared/ui/icon';
import type { Game } from './game.model';

/**
 * Card do jogo. É um link de verdade para `/team` — o card inteiro é
 * clicável pelo `after:inset-0`, e o teclado ganha o foco no próprio link.
 */
@Component({
  selector: 'app-game-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonDirective, CardDirective, Icon],
  template: `
    <article
      appCard
      class="group relative overflow-hidden p-0 transition-colors duration-150 hover:border-foreground/25"
    >
      <!-- Faixa de acento com as cores dos tipos dos iniciais -->
      <span
        class="block h-1.5 w-full"
        [style.background]="accentGradient()"
        aria-hidden="true"
      ></span>

      <div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">
        <!-- Logo do jogo. O alt vai vazio de propósito: o nome já está no
             título abaixo, e repetir viraria leitura dupla no leitor de tela. -->
        <img
          [src]="game().logo"
          alt=""
          width="1495"
          height="884"
          loading="lazy"
          decoding="async"
          class="h-auto w-44 shrink-0 self-center transition-transform duration-150 group-hover:-translate-y-0.5 motion-reduce:transform-none sm:w-48"
        />

        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-muted-foreground">
            {{ game().generation }} · {{ game().region }} · {{ game().year }}
          </p>
          <h2 class="pt-0.5 text-lg font-semibold tracking-tight">
            <a
              [routerLink]="['/team']"
              class="rounded-sm after:absolute after:inset-0 after:content-['']"
            >
              {{ game().title }}
            </a>
          </h2>
          <p class="pt-1 text-sm text-muted-foreground">{{ game().summary }}</p>

          <div class="flex flex-wrap items-center gap-2 pt-3 text-xs text-muted-foreground">
            <span
              class="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5"
            >
              <app-icon name="ball" [size]="12" />
              {{ range() }}
            </span>
            <span
              class="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5"
            >
              <app-icon name="users" [size]="12" />
              Time de até {{ maxTeamSize }}
            </span>
          </div>
        </div>

        <span
          appButton
          variant="default"
          class="pointer-events-none shrink-0 self-start sm:self-center"
          aria-hidden="true"
        >
          {{ teamSize() > 0 ? 'Continuar time' : 'Montar time' }}
          <app-icon name="chevronRight" [size]="16" />
        </span>
      </div>
    </article>
  `,
  host: { class: 'block' },
})
export class GameCard {
  readonly game = input.required<Game>();
  /** Tamanho do time já montado — muda o rótulo do botão. */
  readonly teamSize = input<number>(0);

  protected readonly maxTeamSize = MAX_TEAM_SIZE;

  protected readonly range = computed(() => {
    const { from, to } = this.game().range;
    return `${pokedexNumber(from)}–${pokedexNumber(to)}`;
  });

  protected readonly accentGradient = computed(() => {
    const stops = this.game().accentTypes.map(typeColorVar);
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  });
}
