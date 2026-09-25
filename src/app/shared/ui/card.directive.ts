import { Directive, computed, input } from '@angular/core';
import { cn } from './cn';

/** Superfície padrão: fundo de card, borda e raio do token. */
@Directive({
  selector: '[appCard]',
  host: { '[class]': 'classes()' },
})
export class CardDirective {
  readonly class = input<string>('');
  protected readonly classes = computed(() =>
    cn('rounded-lg border border-border bg-card text-card-foreground', this.class()),
  );
}
