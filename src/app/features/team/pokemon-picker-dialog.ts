import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { pokedexNumber } from '../../core/data/sprites';
import { filterPokemon } from '../../core/services/pokemon-filter';
import { PokemonService } from '../../core/services/pokemon.service';
import { TypeBadge } from '../../shared/components/type-badge';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { Icon } from '../../shared/ui/icon';
import { InputDirective } from '../../shared/ui/input.directive';

export interface PokemonPickerData {
  /** Ids já no time — aparecem desabilitados na lista. */
  readonly excludeIds: readonly number[];
  /** Posição do slot que abriu o diálogo, só para o título. */
  readonly slotNumber: number;
}

/** Busca rápida para preencher um slot. Fecha devolvendo o id escolhido. */
@Component({
  selector: 'app-pokemon-picker-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, Icon, InputDirective, TypeBadge],
  host: {
    class:
      'flex max-h-[80vh] w-[min(32rem,92vw)] flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': '"Escolher Pokémon para o slot " + data.slotNumber',
  },
  template: `
    <header class="flex items-center gap-2 border-b border-border p-3">
      <div class="relative flex-1">
        <app-icon
          name="search"
          [size]="16"
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <label for="picker-busca" class="sr-only">Buscar Pokémon por nome ou número</label>
        <input
          appInput
          id="picker-busca"
          type="search"
          class="pl-9"
          placeholder="Buscar por nome ou número…"
          autocomplete="off"
          cdkFocusInitial
          [value]="queryInput()"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"
        />
      </div>
      <button
        appButton
        variant="ghost"
        size="icon"
        type="button"
        aria-label="Fechar"
        (click)="close()"
      >
        <app-icon name="x" [size]="18" />
      </button>
    </header>

    <p class="sr-only" aria-live="polite">{{ results().length }} resultados</p>

    @if (results().length === 0) {
      <p class="p-8 text-center text-sm text-muted-foreground">
        Nenhum Pokémon encontrado para “{{ queryInput() }}”.
      </p>
    } @else {
      <ul class="flex-1 overflow-y-auto p-1.5">
        @for (pokemon of results(); track pokemon.id) {
          <li>
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:opacity-40"
              [disabled]="isInTeam(pokemon.id)"
              (click)="choose(pokemon.id)"
            >
              <img
                [src]="pokemon.spriteUrl"
                alt=""
                width="40"
                height="40"
                loading="lazy"
                decoding="async"
                class="size-10 shrink-0 [image-rendering:pixelated]"
              />
              <span class="w-11 shrink-0 font-mono text-xs text-muted-foreground">
                {{ number(pokemon.id) }}
              </span>
              <span class="flex-1 text-sm font-medium">{{ pokemon.displayName }}</span>
              <span class="flex gap-1">
                @for (type of pokemon.types; track type) {
                  <app-type-badge [type]="type" size="sm" />
                }
              </span>
              @if (isInTeam(pokemon.id)) {
                <span class="text-xs text-muted-foreground">no time</span>
              }
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class PokemonPickerDialog {
  private readonly pokemon = inject(PokemonService);
  private readonly ref = inject<DialogRef<number | undefined>>(DialogRef);
  protected readonly data = inject<PokemonPickerData>(DIALOG_DATA);

  protected readonly queryInput = signal('');
  private readonly query = toSignal(toObservable(this.queryInput).pipe(debounceTime(200)), {
    initialValue: '',
  });

  private readonly all = this.pokemon.listAllSync();

  protected readonly results = computed(() =>
    filterPokemon(this.all, { query: this.query(), types: [], sort: 'number' }).slice(0, 60),
  );

  protected number(id: number): string {
    return pokedexNumber(id);
  }

  protected isInTeam(id: number): boolean {
    return this.data.excludeIds.includes(id);
  }

  protected onInput(event: Event): void {
    this.queryInput.set((event.target as HTMLInputElement).value);
  }

  /** Enter na busca escolhe o primeiro resultado disponível. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.chooseFirst();
    }
  }

  private chooseFirst(): void {
    const first = this.results().find((pokemon) => !this.isInTeam(pokemon.id));
    if (first) {
      this.choose(first.id);
    }
  }

  protected choose(id: number): void {
    this.ref.close(id);
  }

  protected close(): void {
    this.ref.close(undefined);
  }
}
