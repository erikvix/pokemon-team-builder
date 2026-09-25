import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TeamService, MAX_TEAM_SIZE } from './core/services/team.service';
import { ThemeService } from './core/services/theme.service';
import { ButtonDirective } from './shared/ui/button.directive';
import { Icon } from './shared/ui/icon';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonDirective, Icon],
  templateUrl: './app.html',
})
export class App {
  private readonly themeService = inject(ThemeService);
  protected readonly team = inject(TeamService);
  protected readonly maxTeamSize = MAX_TEAM_SIZE;
  protected readonly theme = this.themeService.theme;

  protected toggleTheme(): void {
    this.themeService.toggle();
  }
}
