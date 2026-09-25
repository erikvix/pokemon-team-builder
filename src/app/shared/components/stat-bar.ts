import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MAX_BASE_STAT, STAT_LABEL, type StatKey } from '../../core/models/pokemon.model';

/** Barra horizontal de um base stat, com rótulo curto e valor sempre visíveis. */
@Component({
  selector: 'app-stat-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dt class="w-10 shrink-0 font-mono text-xs text-muted-foreground" [title]="longLabel()">
      {{ shortLabel() }}
    </dt>
    <dd class="flex flex-1 items-center gap-3">
      <span class="w-9 shrink-0 text-right font-mono text-xs tabular-nums">{{ value() }}</span>
      <span
        class="h-2 flex-1 overflow-hidden rounded-full bg-muted"
        role="img"
        [attr.aria-label]="longLabel() + ': ' + value() + ' de ' + max()"
      >
        <span
          class="block h-full rounded-full bg-foreground/80 transition-[width] duration-200"
          [style.width.%]="percent()"
        ></span>
      </span>
    </dd>
  `,
  host: { class: 'flex items-center gap-2' },
})
export class StatBar {
  readonly stat = input.required<StatKey>();
  readonly value = input.required<number>();
  readonly max = input<number>(MAX_BASE_STAT);

  protected readonly shortLabel = computed(() => STAT_LABEL[this.stat()].short);
  protected readonly longLabel = computed(() => STAT_LABEL[this.stat()].long);
  protected readonly percent = computed(() =>
    Math.min(100, Math.round((this.value() / this.max()) * 100)),
  );
}
