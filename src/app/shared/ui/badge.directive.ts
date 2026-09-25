import { Directive, computed, input } from '@angular/core';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ' +
    'transition-colors duration-150',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
        muted: 'border-transparent bg-muted text-muted-foreground',
        positive: 'border-transparent bg-positive text-positive-foreground',
        negative: 'border-transparent bg-negative text-negative-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

@Directive({
  selector: '[appBadge]',
  host: { '[class]': 'classes()' },
})
export class BadgeDirective {
  readonly variant = input<BadgeVariant>('default');
  readonly class = input<string>('');
  protected readonly classes = computed(() =>
    cn(badgeVariants({ variant: this.variant() }), this.class()),
  );
}
