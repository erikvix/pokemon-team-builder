import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import {
  POKEMON_TYPES,
  TYPE_LABEL,
  typeColorVar,
  type PokemonType,
} from '../../core/data/pokemon-types';
import { PokemonService } from '../../core/services/pokemon.service';
import {
  SORT_KEYS,
  SORT_LABEL,
  filterPokemon,
  type SortKey,
} from '../../core/services/pokemon-filter';
import { TeamService } from '../../core/services/team.service';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { CardDirective } from '../../shared/ui/card.directive';
import { Icon } from '../../shared/ui/icon';
import { InputDirective } from '../../shared/ui/input.directive';
import { Skeleton } from '../../shared/ui/skeleton';
import { PokemonCard } from './pokemon-card';

/** Quantos cards entram por vez — evita jogar 151 nós no DOM de uma vez. */
const PAGE_SIZE = 48;

@Component({
  selector: 'app-pokedex-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonDirective, CardDirective, Icon, InputDirective, Skeleton, PokemonCard],
  templateUrl: './pokedex-page.html',
})
export class PokedexPage {
  private readonly pokemon = inject(PokemonService);
  protected readonly team = inject(TeamService);

  protected readonly allTypes = POKEMON_TYPES;
  protected readonly typeLabel = TYPE_LABEL;
  protected readonly sortKeys = SORT_KEYS;
  protected readonly sortLabel = SORT_LABEL;

  private readonly resource = rxResource({ stream: () => this.pokemon.list() });

  protected readonly status = this.resource.status;
  protected readonly isLoading = this.resource.isLoading;
  protected readonly hasError = computed(() => this.resource.error() !== undefined);

  /** O que está digitado agora (para o valor do input). */
  protected readonly queryInput = signal('');
  /** O que de fato filtra, com debounce para não filtrar a cada tecla. */
  private readonly query = toSignal(toObservable(this.queryInput).pipe(debounceTime(250)), {
    initialValue: '',
  });

  protected readonly selectedTypes = signal<readonly PokemonType[]>([]);
  protected readonly sort = signal<SortKey>('number');
  protected readonly showTypeFilter = signal(false);
  protected readonly limit = signal(PAGE_SIZE);

  protected readonly filtered = computed(() =>
    filterPokemon(this.resource.value() ?? [], {
      query: this.query(),
      types: this.selectedTypes(),
      sort: this.sort(),
    }),
  );

  protected readonly visible = computed(() => this.filtered().slice(0, this.limit()));
  protected readonly hasMore = computed(() => this.filtered().length > this.visible().length);
  protected readonly hasFilters = computed(
    () => this.query().trim() !== '' || this.selectedTypes().length > 0,
  );
  protected readonly skeletons = Array.from({ length: 12 }, (_, index) => index);

  constructor() {
    // Mudou o filtro, volta para a primeira "página" de cards.
    effect(() => {
      this.query();
      this.selectedTypes();
      this.sort();
      this.limit.set(PAGE_SIZE);
    });
  }

  protected typeColor(type: PokemonType): string {
    return typeColorVar(type);
  }

  protected isTypeSelected(type: PokemonType): boolean {
    return this.selectedTypes().includes(type);
  }

  protected toggleType(type: PokemonType): void {
    this.selectedTypes.update((types) =>
      types.includes(type) ? types.filter((current) => current !== type) : [...types, type],
    );
  }

  protected onQueryInput(event: Event): void {
    this.queryInput.set((event.target as HTMLInputElement).value);
  }

  protected onSortChange(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as SortKey);
  }

  protected clearFilters(): void {
    this.queryInput.set('');
    this.selectedTypes.set([]);
  }

  protected showMore(): void {
    this.limit.update((current) => current + PAGE_SIZE);
  }

  protected retry(): void {
    this.resource.reload();
  }

  protected addToTeam(id: number): void {
    this.team.add(id);
  }
}
