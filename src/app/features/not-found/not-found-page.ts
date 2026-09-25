import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { Icon } from '../../shared/ui/icon';

@Component({
  selector: 'app-not-found-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonDirective, Icon],
  template: `
    <section class="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <span
        class="grid size-20 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground"
        aria-hidden="true"
      >
        <app-icon name="ball" [size]="36" />
      </span>
      <div class="space-y-1">
        <p class="font-mono text-sm text-muted-foreground">Erro 404</p>
        <h1 class="text-2xl font-semibold tracking-tight">Essa Pokébola está vazia</h1>
        <p class="text-sm text-muted-foreground">
          A página que você tentou abrir não existe. Talvez tenha fugido para o mato alto.
        </p>
      </div>
      <div class="flex gap-2">
        <a appButton routerLink="/pokedex">
          <app-icon name="search" [size]="16" />
          Ir para a Pokédex
        </a>
        <a appButton variant="outline" routerLink="/team">Ver meu time</a>
      </div>
    </section>
  `,
})
export class NotFoundPage {}
