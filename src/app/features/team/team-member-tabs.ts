import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PokemonSummary } from '../../core/models/pokemon.model';
import { cn } from '../../shared/ui/cn';

/** Faixa de abas com os membros do time — usada nos modais de ataques e de ficha. */
@Component({
  selector: 'app-team-member-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (member of members(); track member.id) {
      <button
        type="button"
        role="tab"
        [attr.aria-selected]="member.id === selectedId()"
        [class]="tabClass(member.id === selectedId())"
        (click)="selectedChange.emit(member)"
      >
        <img
          [src]="member.spriteUrl"
          alt=""
          width="40"
          height="40"
          decoding="async"
          class="size-10 shrink-0 [image-rendering:pixelated]"
        />
        <span class="text-xs font-medium">{{ member.displayName }}</span>
      </button>
    }
  `,
  host: {
    class: 'flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2',
    role: 'tablist',
    'aria-label': 'Membro do time',
  },
})
export class TeamMemberTabs {
  readonly members = input.required<readonly PokemonSummary[]>();
  readonly selectedId = input.required<number>();
  readonly selectedChange = output<PokemonSummary>();

  protected tabClass(active: boolean): string {
    return cn(
      'flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1 transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]',
      active && 'bg-accent ring-1 ring-border',
    );
  }
}
