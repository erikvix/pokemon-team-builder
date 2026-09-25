import { Dialog } from '@angular/cdk/dialog';
import {
  CdkDrag,
  CdkDragPlaceholder,
  CdkDropList,
  type CdkDragDrop,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MAX_TEAM_SIZE, TeamService, parseShareCode } from '../../core/services/team.service';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { CardDirective } from '../../shared/ui/card.directive';
import { Icon } from '../../shared/ui/icon';
import { PokemonPickerDialog, type PokemonPickerData } from './pokemon-picker-dialog';
import { TeamAnalysisPanel } from './team-analysis-panel';
import { TeamSlot } from './team-slot';

type Notice = { readonly kind: 'info' | 'success' | 'error'; readonly text: string } | null;

@Component({
  selector: 'app-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDrag,
    CdkDragPlaceholder,
    CdkDropList,
    ButtonDirective,
    CardDirective,
    Icon,
    TeamAnalysisPanel,
    TeamSlot,
  ],
  templateUrl: './team-page.html',
})
export class TeamPage {
  protected readonly team = inject(TeamService);
  private readonly dialog = inject(Dialog);

  /** `?time=25-6-9` — time compartilhado por link. */
  readonly time = input<string | undefined>(undefined);

  protected readonly maxTeamSize = MAX_TEAM_SIZE;
  protected readonly notice = signal<Notice>(null);
  protected readonly shareUrl = signal<string | null>(null);
  private readonly undoIds = signal<readonly number[] | null>(null);

  protected readonly canUndo = computed(() => this.undoIds() !== null);

  constructor() {
    // Importa o time do link só quando ele difere do que já está montado.
    effect(() => {
      const code = this.time();
      if (!code) {
        return;
      }
      const ids = parseShareCode(code);
      if (ids.length > 0 && ids.join('-') !== this.team.toShareCode()) {
        this.team.replace(ids);
        this.notice.set({ kind: 'info', text: 'Time carregado a partir do link compartilhado.' });
      }
    });
  }

  protected openPicker(index: number): void {
    const data: PokemonPickerData = {
      excludeIds: this.team.memberIds(),
      slotNumber: index + 1,
    };
    this.dialog
      .open<number | undefined>(PokemonPickerDialog, {
        data,
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        panelClass: 'outline-none',
      })
      .closed.subscribe((id) => {
        if (typeof id === 'number') {
          this.team.add(id);
        }
      });
  }

  protected drop(event: CdkDragDrop<unknown>): void {
    this.team.move(event.previousIndex, event.currentIndex);
  }

  protected remove(id: number): void {
    this.team.remove(id);
  }

  protected clear(): void {
    this.undoIds.set(this.team.memberIds());
    this.team.clear();
    this.notice.set({ kind: 'info', text: 'Time limpo.' });
  }

  protected undo(): void {
    const ids = this.undoIds();
    if (ids) {
      this.team.replace(ids);
      this.undoIds.set(null);
      this.notice.set(null);
    }
  }

  protected save(): void {
    this.notice.set({
      kind: 'success',
      text: 'Time salvo neste navegador — ele já volta sozinho no próximo acesso.',
    });
  }

  protected async share(): Promise<void> {
    const url = `${location.origin}/team?time=${this.team.toShareCode()}`;
    this.shareUrl.set(url);
    try {
      await navigator.clipboard.writeText(url);
      this.notice.set({ kind: 'success', text: 'Link do time copiado para a área de transferência.' });
    } catch {
      this.notice.set({ kind: 'error', text: 'Não deu para copiar. O link está logo abaixo.' });
    }
  }
}
