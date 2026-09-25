import { Directive, computed, input } from '@angular/core';
import { cn } from './cn';

@Directive({
  selector: 'input[appInput]',
  host: { '[class]': 'classes()' },
})
export class InputDirective {
  readonly class = input<string>('');
  protected readonly classes = computed(() =>
    cn(
      'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs',
      'placeholder:text-muted-foreground transition-colors duration-150',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] outline-none',
      'disabled:cursor-not-allowed disabled:opacity-50',
      this.class(),
    ),
  );
}
