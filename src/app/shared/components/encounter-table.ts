import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Game, GameVersion } from '../../core/data/games';
import type {
  EncounterCondition,
  EncounterMethod,
  GameVersions,
  PokemonEncounter,
} from '../../core/models/pokemon.model';

const METHOD_LABEL: Readonly<Record<EncounterMethod, string>> = {
  walk: 'Grama / caverna',
  'old-rod': 'Old Rod',
  'good-rod': 'Good Rod',
  'super-rod': 'Super Rod',
  surf: 'Surf',
  'rock-smash': 'Rock Smash',
  gift: 'Presente',
  'gift-egg': 'Ovo de presente',
  static: 'Encontro fixo',
  pokeflute: 'Poké Flute',
  'npc-trade': 'Troca com NPC',
  'roaming-grass': 'Errante',
  'roaming-water': 'Errante (água)',
  headbutt: 'Headbutt',
  'squirt-bottle': 'SquirtBottle',
  seaweed: 'Dive (alga)',
  'feebas-tile-fishing': 'Pesca (pontos do Feebas)',
  'devon-scope': 'Devon Scope',
  'wailmer-pail': 'Wailmer Pail',
};

const CONDITION_LABEL: Readonly<Record<EncounterCondition, string>> = {
  morning: 'Manhã',
  day: 'Dia',
  night: 'Noite',
  swarm: 'Swarm',
  'radio-hoenn': 'Rádio: Hoenn Sound',
  'radio-sinnoh': 'Rádio: Sinnoh Sound',
  'bug-contest': 'Concurso de Insetos',
  'safari-blocks': 'Safari com blocos',
  'headbutt-common': 'Árvore comum',
  'headbutt-rare': 'Árvore rara',
};

/** Métodos sem sorteio — a chance não significa nada para eles. */
const GUARANTEED: ReadonlySet<EncounterMethod> = new Set([
  'gift',
  'gift-egg',
  'static',
  'pokeflute',
  'npc-trade',
]);

/**
 * Tabela de onde encontrar: local, forma de encontro, condições (horário,
 * rádio…), exclusivo de versão, faixa de nível e chance. Usada na ficha do
 * time e na página do Pokémon.
 */
@Component({
  selector: 'app-encounter-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">
        {{
          caption()
        }}
      </caption>
      <thead>
        <tr class="border-b border-border text-left text-xs text-muted-foreground">
          <th scope="col" class="py-2 pr-2 font-medium">Local</th>
          <th scope="col" class="w-16 py-2 pr-2 text-right font-medium">Nível</th>
          <th scope="col" class="w-14 py-2 text-right font-medium">Chance</th>
        </tr>
      </thead>
      <tbody>
        @for (row of encounters(); track $index) {
          <tr class="border-b border-border/60 align-top last:border-0">
            <td class="py-2 pr-2">
              <span class="font-medium">{{ row.area }}</span>
              <span
                class="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground"
              >
                {{ methodLabel[row.method] }}
                @for (condition of row.conditions; track condition) {
                  <span class="rounded bg-muted px-1 text-foreground">{{
                    conditionLabel[condition]
                  }}</span>
                }
                @if (versionsOnly(row.versions); as versions) {
                  <span
                    class="rounded border px-1 font-medium text-foreground"
                    [style.border-color]="versionColor(versions)"
                    >Só {{ versionLabel(versions) }}</span
                  >
                }
              </span>
            </td>
            <td class="py-2 pr-2 text-right font-mono text-xs">
              {{ row.minLevel === row.maxLevel ? row.minLevel : row.minLevel + '–' + row.maxLevel }}
            </td>
            <td class="py-2 text-right font-mono text-xs">
              {{ guaranteed.has(row.method) ? '—' : row.chance + '%' }}
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
  host: { class: 'block' },
})
export class EncounterTable {
  readonly encounters = input.required<readonly PokemonEncounter[]>();
  /** Jogo dos encontros — dá nome e cor às versões exclusivas. */
  readonly game = input.required<Game>();
  readonly caption = input.required<string>();

  protected readonly methodLabel = METHOD_LABEL;
  protected readonly conditionLabel = CONDITION_LABEL;
  protected readonly guaranteed = GUARANTEED;

  /** As versões, quando o encontro não existe em todas (`Só Ruby e Emerald`). */
  protected versionsOnly(versions: GameVersions): readonly GameVersion[] | undefined {
    if (versions === 'all') {
      return undefined;
    }
    return this.game().versions.filter((version) => versions.includes(version.id));
  }

  protected versionLabel(versions: readonly GameVersion[]): string {
    const labels = versions.map((version) => version.label);
    return labels.length > 1
      ? `${labels.slice(0, -1).join(', ')} e ${labels.at(-1)}`
      : (labels[0] ?? '');
  }

  /** Borda na cor da capa (Fogo para FireRed…); com mais de uma versão, neutra. */
  protected versionColor(versions: readonly GameVersion[]): string {
    const only = versions.length === 1 ? versions[0] : undefined;
    return only
      ? `color-mix(in oklab, var(--type-${only.colorType}) 60%, transparent)`
      : 'var(--border)';
  }
}
