import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TYPE_LABEL, typeColorVar, type PokemonType } from '../../core/data/pokemon-types';
import { cn } from '../ui/cn';

/**
 * Badge de tipo. A cor canônica entra como ponto e fundo tênue; o texto usa
 * `--foreground` para garantir contraste AA nos dois temas — e o nome do tipo
 * está sempre escrito, nunca só a cor.
 */
@Component({
  selector: 'app-type-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="size-2 shrink-0 rounded-full"
      [style.background-color]="color()"
      aria-hidden="true"
    ></span>
    <span>{{ label() }}</span>
  `,
  host: {
    '[class]': 'classes()',
    '[style.background-color]': 'background()',
    '[style.border-color]': 'borderColor()',
  },
})
export class TypeBadge {
  readonly type = input.required<PokemonType>();
  readonly size = input<'sm' | 'md'>('md');

  protected readonly color = computed(() => typeColorVar(this.type()));
  protected readonly label = computed(() => TYPE_LABEL[this.type()]);
  protected readonly background = computed(
    () => `color-mix(in oklab, ${this.color()} 16%, transparent)`,
  );
  protected readonly borderColor = computed(
    () => `color-mix(in oklab, ${this.color()} 35%, transparent)`,
  );
  protected readonly classes = computed(() =>
    cn(
      'inline-flex items-center gap-1.5 rounded-md border font-medium text-foreground',
      this.size() === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs',
    ),
  );
}
