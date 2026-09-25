import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { pokedexNumber } from '../../core/data/sprites';
import type { PokemonSummary } from '../../core/models/pokemon.model';
import { TypeBadge } from '../../shared/components/type-badge';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { CardDirective } from '../../shared/ui/card.directive';
import { Icon } from '../../shared/ui/icon';

/**
 * Um dos seis slots. Vazio é um botão tracejado; preenchido traz remover,
 * mover (alternativa de teclado ao arrastar) e link para o detalhe.
 */
@Component({
  selector: 'app-team-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TypeBadge, ButtonDirective, CardDirective, Icon],
  template: `
    @if (pokemon(); as member) {
      <article
        appCard
        class="relative flex h-full flex-col items-center gap-1.5 p-3 pt-8"
        [attr.aria-label]="'Slot ' + slotNumber() + ': ' + member.displayName"
      >
        <span
          class="absolute left-2 top-2 flex items-center gap-1 font-mono text-[11px] text-muted-foreground"
        >
          <app-icon name="grip" [size]="12" class="cursor-grab" aria-hidden="true" />
          {{ slotNumber() }}
        </span>

        <button
          appButton
          variant="ghost"
          size="icon-sm"
          type="button"
          class="absolute right-1.5 top-1.5 text-muted-foreground hover:text-destructive"
          [attr.aria-label]="'Remover ' + member.displayName + ' do time'"
          (click)="remove.emit()"
        >
          <app-icon name="x" [size]="14" />
        </button>

        <img
          [src]="member.spriteUrl"
          [alt]="'Sprite de ' + member.displayName"
          width="80"
          height="80"
          loading="lazy"
          decoding="async"
          class="size-16 [image-rendering:pixelated]"
        />

        <a [routerLink]="['/pokemon', member.id]" class="rounded-sm text-sm font-semibold">
          {{ member.displayName }}
        </a>
        <span class="font-mono text-[11px] text-muted-foreground">{{ number() }}</span>

        <div class="flex flex-wrap justify-center gap-1">
          @for (type of member.types; track type) {
            <app-type-badge [type]="type" size="sm" />
          }
        </div>

        <div class="mt-auto flex gap-1 pt-2">
          <button
            appButton
            variant="ghost"
            size="icon-sm"
            type="button"
            [disabled]="!canMoveBack()"
            [attr.aria-label]="'Mover ' + member.displayName + ' para o slot anterior'"
            (click)="moveBack.emit()"
          >
            <app-icon name="chevronLeft" [size]="14" />
          </button>
          <button
            appButton
            variant="ghost"
            size="icon-sm"
            type="button"
            [disabled]="!canMoveForward()"
            [attr.aria-label]="'Mover ' + member.displayName + ' para o próximo slot'"
            (click)="moveForward.emit()"
          >
            <app-icon name="chevronRight" [size]="14" />
          </button>
        </div>
      </article>
    } @else {
      <button
        type="button"
        class="flex h-full min-h-[11rem] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors duration-150 hover:border-foreground/30 hover:bg-accent/40 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
        [attr.aria-label]="'Slot ' + slotNumber() + ' vazio: escolher um Pokémon'"
        (click)="pick.emit()"
      >
        <app-icon name="plus" [size]="22" />
        <span class="text-xs font-medium">Slot {{ slotNumber() }}</span>
      </button>
    }
  `,
  host: { class: 'block h-full' },
})
export class TeamSlot {
  readonly pokemon = input<PokemonSummary | null>(null);
  readonly index = input.required<number>();
  readonly canMoveBack = input<boolean>(false);
  readonly canMoveForward = input<boolean>(false);

  readonly pick = output<void>();
  readonly remove = output<void>();
  readonly moveBack = output<void>();
  readonly moveForward = output<void>();

  protected readonly slotNumber = computed(() => this.index() + 1);
  protected readonly number = computed(() => {
    const member = this.pokemon();
    return member ? pokedexNumber(member.id) : '';
  });
}
