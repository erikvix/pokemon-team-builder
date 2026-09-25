import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { pokedexNumber } from '../../core/data/sprites';
import type { PokemonSummary } from '../../core/models/pokemon.model';
import { TypeBadge } from '../../shared/components/type-badge';
import { CardDirective } from '../../shared/ui/card.directive';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { Icon } from '../../shared/ui/icon';

/** Card da Pokédex. O link cobre o card; o botão fica acima dele (`z-10`). */
@Component({
  selector: 'app-pokemon-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TypeBadge, CardDirective, ButtonDirective, Icon],
  template: `
    <article
      appCard
      class="group relative flex flex-col items-center gap-2 p-3 transition-colors duration-150 hover:border-foreground/25 hover:bg-accent/40"
    >
      <button
        appButton
        [variant]="inTeam() ? 'secondary' : 'outline'"
        size="icon-sm"
        type="button"
        class="absolute right-2 top-2 z-10"
        [disabled]="addDisabled()"
        [attr.aria-label]="addLabel()"
        [title]="addLabel()"
        (click)="add.emit(pokemon().id)"
      >
        <app-icon [name]="inTeam() ? 'check' : 'plus'" [size]="14" />
      </button>

      <img
        [src]="pokemon().spriteUrl"
        [alt]="'Sprite de ' + pokemon().displayName"
        width="96"
        height="96"
        loading="lazy"
        decoding="async"
        class="size-20 [image-rendering:pixelated] transition-transform duration-150 group-hover:scale-110 motion-reduce:transform-none"
      />

      <span class="font-mono text-xs text-muted-foreground">{{ number() }}</span>

      <a
        [routerLink]="['/pokemon', pokemon().id]"
        class="rounded-sm text-sm font-semibold after:absolute after:inset-0 after:content-['']"
      >
        {{ pokemon().displayName }}
      </a>

      <div class="flex flex-wrap justify-center gap-1">
        @for (type of pokemon().types; track type) {
          <app-type-badge [type]="type" size="sm" />
        }
      </div>
    </article>
  `,
})
export class PokemonCard {
  readonly pokemon = input.required<PokemonSummary>();
  readonly inTeam = input<boolean>(false);
  readonly teamFull = input<boolean>(false);

  readonly add = output<number>();

  protected readonly number = computed(() => pokedexNumber(this.pokemon().id));
  protected readonly addDisabled = computed(() => this.inTeam() || this.teamFull());
  protected readonly addLabel = computed(() => {
    const name = this.pokemon().displayName;
    if (this.inTeam()) {
      return `${name} já está no time`;
    }
    if (this.teamFull()) {
      return 'Time cheio — remova alguém antes de adicionar';
    }
    return `Adicionar ${name} ao time`;
  });
}
