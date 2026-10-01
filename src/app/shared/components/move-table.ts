import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MoveLearnMethod, PokemonMove } from '../../core/models/pokemon.model';
import { MoveCategoryBadge } from './move-category-badge';
import { TypeBadge } from './type-badge';

export const MOVE_METHODS: ReadonlyArray<{
  readonly key: MoveLearnMethod;
  readonly label: string;
}> = [
  { key: 'levelUp', label: 'Por nível' },
  { key: 'machine', label: 'TM / HM' },
  { key: 'egg', label: 'Ovo' },
  { key: 'tutor', label: 'Tutor' },
];

/**
 * Tabela de golpes de uma forma de aprender: nível ou máquina (quando cabe),
 * golpe com tipo e descrição, categoria, poder, precisão e PP. Usada no modal
 * de ataques do time e na página do Pokémon.
 */
@Component({
  selector: 'app-move-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoveCategoryBadge, TypeBadge],
  template: `
    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">
        {{
          caption()
        }}
      </caption>
      <thead>
        <tr class="border-b border-border text-left text-xs text-muted-foreground">
          @if (method() === 'levelUp' || method() === 'machine') {
            <th scope="col" class="w-12 py-2 pr-2 font-medium">
              {{ method() === 'levelUp' ? 'Nv.' : 'Máq.' }}
            </th>
          }
          <th scope="col" class="py-2 pr-2 font-medium">Golpe</th>
          <th scope="col" class="hidden w-24 py-2 pr-2 font-medium sm:table-cell">Categoria</th>
          <th scope="col" class="w-12 py-2 pr-2 text-right font-medium">
            <abbr title="Poder" class="no-underline">Pod.</abbr>
          </th>
          <th scope="col" class="w-12 py-2 pr-2 text-right font-medium">
            <abbr title="Precisão" class="no-underline">Prec.</abbr>
          </th>
          <th scope="col" class="w-10 py-2 text-right font-medium">PP</th>
        </tr>
      </thead>
      <tbody>
        @for (move of moves(); track $index) {
          <tr class="border-b border-border/60 align-top last:border-0">
            @if (method() === 'levelUp') {
              <td class="py-2 pr-2 font-mono text-xs text-muted-foreground">
                {{ move.level === 1 ? 'Início' : move.level }}
              </td>
            } @else if (method() === 'machine') {
              <td class="py-2 pr-2 font-mono text-xs text-muted-foreground">
                {{ move.machine }}
              </td>
            }
            <td class="py-2 pr-2">
              <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span class="font-medium">{{ move.displayName }}</span>
                @if (move.type; as type) {
                  <app-type-badge [type]="type" size="sm" />
                } @else {
                  <span
                    class="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium"
                    >???</span
                  >
                }
                <!-- No mobile a coluna some; o selo vem junto do nome. -->
                <app-move-category-badge class="sm:hidden" [category]="move.category" />
              </div>
              @if (showDescriptions() && move.description) {
                <p class="mt-0.5 text-xs text-muted-foreground">{{ move.description }}</p>
              }
            </td>
            <td class="hidden py-2 pr-2 sm:table-cell">
              <app-move-category-badge [category]="move.category" />
            </td>
            <td class="py-2 pr-2 text-right font-mono text-xs">{{ move.power ?? '—' }}</td>
            <td class="py-2 pr-2 text-right font-mono text-xs">{{ move.accuracy ?? '—' }}</td>
            <td class="py-2 text-right font-mono text-xs">{{ move.pp ?? '—' }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
  host: { class: 'block' },
})
export class MoveTable {
  readonly moves = input.required<readonly PokemonMove[]>();
  readonly method = input.required<MoveLearnMethod>();
  /** Legenda para leitor de tela (`Ataques de Pikachu — Por nível`). */
  readonly caption = input.required<string>();
  readonly showDescriptions = input<boolean>(true);
}
