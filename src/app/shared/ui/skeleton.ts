import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cn } from './cn';

/** Placeholder de carregamento. `aria-hidden` porque quem anuncia é o container. */
@Component({
  selector: 'app-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: {
    '[class]': 'classes()',
    'aria-hidden': 'true',
  },
})
export class Skeleton {
  readonly class = input<string>('h-4 w-full');
  protected readonly classes = computed(() =>
    cn('block animate-pulse rounded-md bg-muted', this.class()),
  );
}
