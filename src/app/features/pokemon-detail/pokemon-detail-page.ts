import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { StatBar } from '../../shared/components/stat-bar';
import { TypeBadge } from '../../shared/components/type-badge';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { CardDirective } from '../../shared/ui/card.directive';
import { Icon } from '../../shared/ui/icon';
import { Skeleton } from '../../shared/ui/skeleton';
import { POKEMON_TYPES, type PokemonType } from '../../core/data/pokemon-types';
import { pokedexNumber } from '../../core/data/sprites';
import { defensiveProfile, multiplierLabel, type Effectiveness } from '../../core/data/type-chart';
import { STAT_KEYS, type EvolutionStage } from '../../core/models/pokemon.model';
import { PokemonService } from '../../core/services/pokemon.service';
import { TeamService } from '../../core/services/team.service';

export interface EffectivenessGroup {
  readonly multiplier: Effectiveness;
  readonly label: string;
  readonly types: readonly PokemonType[];
}

@Component({
  selector: 'app-pokemon-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonDirective, CardDirective, Icon, Skeleton, StatBar, TypeBadge],
  templateUrl: './pokemon-detail-page.html',
})
export class PokemonDetailPage {
  private readonly pokemon = inject(PokemonService);
  protected readonly team = inject(TeamService);

  /** Vem do parâmetro de rota `:id` (component input binding). */
  readonly id = input.required<string>();

  protected readonly statKeys = STAT_KEYS;

  private readonly numericId = computed(() => {
    const parsed = Number.parseInt(this.id(), 10);
    return Number.isInteger(parsed) ? parsed : Number.NaN;
  });

  protected readonly isKnownId = computed(
    () => this.pokemon.getSummary(this.numericId()) !== undefined,
  );

  private readonly resource = rxResource({
    params: () => (this.isKnownId() ? this.numericId() : undefined),
    stream: ({ params }) => this.pokemon.getDetail(params),
  });

  protected readonly detail = this.resource.value;
  protected readonly isLoading = this.resource.isLoading;
  protected readonly errorMessage = computed(() => {
    if (!this.isKnownId()) {
      return 'Esse número não faz parte da geração 1 (#001–#151).';
    }
    const error = this.resource.error();
    return error instanceof Error ? error.message : undefined;
  });

  protected readonly number = computed(() => pokedexNumber(this.numericId()));
  protected readonly inTeam = computed(() => this.team.has(this.numericId()));

  /** Altura em metros e peso em quilos — a PokeAPI devolve dm e hg. */
  protected readonly height = computed(() => ((this.detail()?.height ?? 0) / 10).toFixed(1));
  protected readonly weight = computed(() => ((this.detail()?.weight ?? 0) / 10).toFixed(1));

  protected readonly effectiveness = computed<readonly EffectivenessGroup[]>(() => {
    const types = this.detail()?.types;
    if (!types) {
      return [];
    }
    const profile = defensiveProfile(types);
    const order: readonly Effectiveness[] = [4, 2, 0.5, 0.25, 0];
    return order
      .map((multiplier) => ({
        multiplier,
        label: multiplierLabel(multiplier),
        types: POKEMON_TYPES.filter((type) => profile[type] === multiplier),
      }))
      .filter((group) => group.types.length > 0);
  });

  protected readonly weaknesses = computed(() =>
    this.effectiveness().filter((group) => group.multiplier > 1),
  );
  protected readonly resistances = computed(() =>
    this.effectiveness().filter((group) => group.multiplier > 0 && group.multiplier < 1),
  );
  protected readonly immunities = computed(() =>
    this.effectiveness().filter((group) => group.multiplier === 0),
  );

  /** Linha evolutiva agrupada por estágio (Eevee tem três ramos no mesmo). */
  protected readonly evolutionStages = computed<ReadonlyArray<readonly EvolutionStage[]>>(() => {
    const line = this.detail()?.evolutionLine ?? [];
    const byStage = new Map<number, EvolutionStage[]>();
    for (const stage of line) {
      const bucket = byStage.get(stage.stage) ?? [];
      bucket.push(stage);
      byStage.set(stage.stage, bucket);
    }
    return [...byStage.entries()].sort(([a], [b]) => a - b).map(([, stages]) => stages);
  });

  protected readonly hasEvolution = computed(() => this.evolutionStages().length > 1);

  protected toggleTeam(): void {
    const id = this.numericId();
    if (this.inTeam()) {
      this.team.remove(id);
    } else {
      this.team.add(id);
    }
  }

  protected retry(): void {
    this.resource.reload();
  }
}
