import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { MoveCategory } from '../../core/models/pokemon.model';

export const MOVE_CATEGORIES: readonly MoveCategory[] = ['physical', 'special', 'status'];

export const MOVE_CATEGORY_LABEL: Readonly<Record<MoveCategory, string>> = {
  physical: 'Físico',
  special: 'Especial',
  status: 'Status',
};

/**
 * Ícone da categoria do golpe: impacto (físico), ondas (especial) e círculo
 * partido (status). Desenhados aqui, como os demais ícones do projeto.
 */
@Component({
  selector: 'app-move-category-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      [style.color]="color()"
    >
      @switch (category()) {
        @case ('physical') {
          <path
            fill="currentColor"
            d="M12 1.5l2.6 5.6 5.9-1.6-2.3 5.6 4.8 3.4-5.9 1.3.2 6.1L12 18.3l-5.3 3.6.2-6.1L1 14.5l4.8-3.4-2.3-5.6 5.9 1.6z"
          />
        }
        @case ('special') {
          <g fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="12" cy="12" r="9.5" />
            <circle cx="12" cy="12" r="5.5" />
          </g>
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        }
        @case ('status') {
          <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.2" />
          <path fill="currentColor" d="M12 2.5a9.5 9.5 0 0 1 0 19z" />
        }
      }
    </svg>
  `,
  host: { class: 'inline-flex shrink-0' },
})
export class MoveCategoryIcon {
  readonly category = input.required<MoveCategory>();
  readonly size = input<number>(14);
  protected readonly color = computed(() => `var(--category-${this.category()})`);
}

/**
 * Selo de categoria: só o ícone, num quadradinho com a borda na cor da
 * categoria. O nome aparece numa dica ao passar o mouse, ao focar pelo
 * teclado ou ao tocar — e o leitor de tela lê o nome pelo `aria-label`.
 */
@Component({
  selector: 'app-move-category-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoveCategoryIcon],
  template: `
    <span
      class="inline-grid size-6 place-items-center rounded-md border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
      [style.border-color]="borderColor()"
      role="img"
      tabindex="0"
      [attr.aria-label]="label()"
    >
      <app-move-category-icon [category]="category()" [size]="14" />
    </span>
    <span
      class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      aria-hidden="true"
      >{{ label() }}</span
    >
  `,
  host: { class: 'group relative inline-flex' },
})
export class MoveCategoryBadge {
  readonly category = input.required<MoveCategory>();
  protected readonly label = computed(() => MOVE_CATEGORY_LABEL[this.category()]);
  protected readonly borderColor = computed(
    () => `color-mix(in oklab, var(--category-${this.category()}) 45%, transparent)`,
  );
}
