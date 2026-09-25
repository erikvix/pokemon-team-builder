import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MAX_TEAM_SIZE, TeamService } from '../../core/services/team.service';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { Icon } from '../../shared/ui/icon';
import { GameCard } from './game-card';
import { GAMES } from './game.model';

/** Tela inicial: escolha do jogo. Por enquanto só a geração 1. */
@Component({
  selector: 'app-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonDirective, Icon, GameCard],
  template: `
    <section class="mx-auto flex max-w-3xl flex-col gap-6 py-6">
      <header class="flex flex-col gap-1">
        <h1 class="text-2xl font-semibold tracking-tight">Escolha o jogo</h1>
        <p class="text-sm text-muted-foreground">
          Selecione o jogo para montar um time de até {{ maxTeamSize }} Pokémon e ver na hora as
          forças e fraquezas dele.
        </p>
      </header>

      <ul class="flex flex-col gap-3">
        @for (game of games; track game.id) {
          <li>
            <app-game-card [game]="game" [teamSize]="team.size()" />
          </li>
        }
      </ul>

      @if (team.size() > 0) {
        <p class="text-sm text-muted-foreground" aria-live="polite">
          Você já tem {{ team.size() }} de {{ maxTeamSize }} slots preenchidos.
        </p>
      }

      <footer class="flex items-center gap-2 border-t border-border pt-4">
        <p class="text-sm text-muted-foreground">Só quer olhar os Pokémon?</p>
        <a appButton variant="outline" size="sm" routerLink="/pokedex">
          <app-icon name="search" [size]="15" />
          Abrir a Pokédex
        </a>
      </footer>
    </section>
  `,
})
export class HomePage {
  protected readonly team = inject(TeamService);
  protected readonly games = GAMES;
  protected readonly maxTeamSize = MAX_TEAM_SIZE;
}
