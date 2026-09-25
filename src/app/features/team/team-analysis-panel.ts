import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TYPE_LABEL, typeColorVar, type PokemonType } from '../../core/data/pokemon-types';
import { STAT_KEYS } from '../../core/models/pokemon.model';
import { COMMON_WEAKNESS_THRESHOLD, type TeamAnalysis } from '../../core/services/team-analysis';
import { StatBar } from '../../shared/components/stat-bar';
import { TypeBadge } from '../../shared/components/type-badge';
import { CardDirective } from '../../shared/ui/card.directive';
import { Icon } from '../../shared/ui/icon';

/**
 * Análise do time: matriz defensiva pelos 18 tipos, alertas, cobertura
 * ofensiva e média de stats. Número e ícone acompanham toda cor usada.
 */
@Component({
  selector: 'app-team-analysis-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardDirective, Icon, StatBar, TypeBadge],
  templateUrl: './team-analysis-panel.html',
})
export class TeamAnalysisPanel {
  readonly analysis = input.required<TeamAnalysis>();

  protected readonly threshold = COMMON_WEAKNESS_THRESHOLD;
  protected readonly statKeys = STAT_KEYS;
  protected readonly typeLabel = TYPE_LABEL;

  protected readonly isEmpty = computed(() => this.analysis().memberCount === 0);
  protected readonly hasAlerts = computed(
    () => this.analysis().commonWeaknesses.length > 0 || this.analysis().uncoveredTypes.length > 0,
  );

  protected typeColor(type: PokemonType): string {
    return typeColorVar(type);
  }
}
