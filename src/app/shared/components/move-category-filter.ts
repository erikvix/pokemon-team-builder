import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import type { MoveCategory, PokemonMoveset } from '../../core/models/pokemon.model';
import { MOVE_CATEGORIES, MOVE_CATEGORY_LABEL, MoveCategoryIcon } from './move-category-badge';

/** Aplica o filtro de categoria às quatro listas do moveset. */
export function filterMoveset(
  moveset: PokemonMoveset,
  category: MoveCategory | 'all',
): PokemonMoveset {
  if (category === 'all') {
    return moveset;
  }
  const keep = (list: PokemonMoveset['levelUp']) =>
    list.filter((move) => move.category === category);
  return {
    levelUp: keep(moveset.levelUp),
    machine: keep(moveset.machine),
    tutor: keep(moveset.tutor),
    egg: keep(moveset.egg),
  };
}

/** Filtro de categoria dos golpes: Todas, Físico, Especial ou Status. */
@Component({
  selector: 'app-move-category-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoveCategoryIcon],
  template: `
    <button
      type="button"
      [class]="chipClass(value() === 'all')"
      [attr.aria-pressed]="value() === 'all'"
      (click)="value.set('all')"
    >
      Todas
    </button>
    @for (category of categories; track category) {
      <button
        type="button"
        [class]="chipClass(value() === category)"
        [attr.aria-pressed]="value() === category"
        (click)="value.set(category)"
      >
        <app-move-category-icon [category]="category" [size]="12" />
        {{ labels[category] }}
      </button>
    }
  `,
  host: {
    class: 'flex flex-wrap items-center gap-1',
    role: 'group',
    'aria-label': 'Filtrar golpes por categoria',
  },
})
export class MoveCategoryFilter {
  readonly value = model<MoveCategory | 'all'>('all');

  protected readonly categories = MOVE_CATEGORIES;
  protected readonly labels = MOVE_CATEGORY_LABEL;

  protected chipClass(active: boolean): string {
    return (
      'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] ' +
      (active
        ? 'border-foreground/40 bg-accent text-accent-foreground'
        : 'border-border text-muted-foreground')
    );
  }
}
