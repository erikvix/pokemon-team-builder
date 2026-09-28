import { Dialog } from '@angular/cdk/dialog';
import { CdkDrag, CdkDragPlaceholder, CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEFAULT_GAME_ID } from '../../core/data/games';
import { GameService } from '../../core/services/game.service';
import { MAX_TEAM_SIZE, TeamService, parseShareCode } from '../../core/services/team.service';
import { ButtonDirective } from '../../shared/ui/button.directive';
import { CardDirective } from '../../shared/ui/card.directive';
import { Icon } from '../../shared/ui/icon';
import { PokemonPickerDialog, type PokemonPickerData } from './pokemon-picker-dialog';
import { TeamAnalysisPanel } from './team-analysis-panel';
import { TeamInfoDialog, type TeamInfoData } from './team-info-dialog';
import { TeamMovesDialog, type TeamMovesData } from './team-moves-dialog';
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
    RouterLink,
    TeamAnalysisPanel,
    TeamSlot,
  ],
  templateUrl: './team-page.html',
})
export class TeamPage {
  protected readonly team = inject(TeamService);
  protected readonly game = inject(GameService);
  private readonly dialog = inject(Dialog);

  /** `?time=25-6-9` — time compartilhado por link. */
  readonly time = input<string | undefined>(undefined);
  /** `?jogo=heartgold-soulsilver` — jogo do link ou do card da tela inicial. */
  readonly jogo = input<string | undefined>(undefined);

  protected readonly maxTeamSize = MAX_TEAM_SIZE;
  protected readonly notice = signal<Notice>(null);
  protected readonly shareUrl = signal<string | null>(null);
  private readonly undoIds = signal<readonly number[] | null>(null);
  /** Evita reimportar o mesmo link a cada mudança no time. */
  private lastImportedCode: string | null = null;

  protected readonly canUndo = computed(() => this.undoIds() !== null);

  constructor() {
    // Importa o time do link só quando ele difere do que já está montado.
    effect(() => {
      const gameId = this.jogo();
      const code = this.time();
      // Links de antes dos outros jogos não têm `jogo`: eram de FireRed/LeafGreen.
      const target = gameId ?? (code ? DEFAULT_GAME_ID : undefined);
      if (target) {
        untracked(() => this.game.select(target));
      }
      if (!code || `${target}|${code}` === this.lastImportedCode) {
        return;
      }
      this.lastImportedCode = `${target}|${code}`;
      const ids = parseShareCode(code);
      // `untracked`: ler o time aqui não pode reagendar o effect a cada mudança.
      const differs = untracked(() => ids.join('-') !== this.team.toShareCode());
      if (ids.length > 0 && differs) {
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

  /** Abre os ataques do time; `id` escolhe o membro selecionado de início. */
  protected openMoves(id?: number): void {
    const members = this.team.members();
    const first = members[0];
    if (!first) {
      return;
    }
    const data: TeamMovesData = { members, initialId: id ?? first.id };
    this.dialog.open(TeamMovesDialog, {
      data,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      panelClass: 'outline-none',
    });
  }

  /** Ficha do membro clicado, com abas para os outros do time. */
  protected openInfo(id: number): void {
    const data: TeamInfoData = { members: this.team.members(), initialId: id };
    this.dialog.open(TeamInfoDialog, {
      data,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      panelClass: 'outline-none',
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
    const gameId = this.game.current().id;
    const url = `${location.origin}/team?jogo=${gameId}&time=${this.team.toShareCode()}`;
    this.shareUrl.set(url);
    try {
      await navigator.clipboard.writeText(url);
      this.notice.set({
        kind: 'success',
        text: 'Link do time copiado para a área de transferência.',
      });
    } catch {
      this.notice.set({ kind: 'error', text: 'Não deu para copiar. O link está logo abaixo.' });
    }
  }
}
