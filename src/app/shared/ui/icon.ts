import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Ícones inline (traçado, 24×24). Ficam aqui em vez de virar dependência para
 * não carregar uma biblioteca inteira por meia dúzia de glifos.
 */
export const ICON_PATHS = {
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
  ],
  moon: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'm21 21-4.35-4.35'],
  plus: ['M12 5v14M5 12h14'],
  x: ['M18 6 6 18M6 6l12 12'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M6 6l1 14h10l1-14', 'M10 10v6M14 10v6'],
  share: ['M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6', 'M12 3v13', 'm8 7 4-4 4 4'],
  link: [
    'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1',
    'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  ],
  chevronRight: ['m9 18 6-6-6-6'],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronDown: ['m6 9 6 6 6-6'],
  grip: ['M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01'],
  alert: ['M12 3 2 20h20L12 3z', 'M12 9v5', 'M12 17h.01'],
  shield: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z'],
  zap: ['M13 2 3 14h8l-1 8 10-12h-8l1-8z'],
  check: ['m20 6-11 11-5-5'],
  sort: ['M7 3v18', 'm4 6 3-3 3 3', 'M17 21V3', 'm14 18 3 3 3-3'],
  filter: ['M3 5h18l-7 8v6l-4 2v-8L3 5z'],
  ball: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    'M3 12h6M15 12h6',
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  ],
  users: [
    'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1',
    'M9.5 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    'M21 19v-1a4 4 0 0 0-3-3.87',
  ],
  refresh: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6'],
} as const;

export type IconName = keyof typeof ICON_PATHS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @for (path of paths(); track path) {
        <path [attr.d]="path" />
      }
    </svg>
  `,
  host: { class: 'inline-flex shrink-0' },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<number>(16);
  protected readonly paths = computed<readonly string[]>(() => ICON_PATHS[this.name()]);
}
