import type { Routes } from '@angular/router';

const APP_NAME = 'Pokémon Team Builder';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'pokedex' },
  {
    path: 'pokedex',
    title: `Pokédex — ${APP_NAME}`,
    loadComponent: () => import('./features/pokedex/pokedex-page').then((m) => m.PokedexPage),
  },
  {
    path: 'pokemon/:id',
    title: `Pokémon — ${APP_NAME}`,
    loadComponent: () =>
      import('./features/pokemon-detail/pokemon-detail-page').then((m) => m.PokemonDetailPage),
  },
  {
    path: 'team',
    title: `Meu time — ${APP_NAME}`,
    loadComponent: () => import('./features/team/team-page').then((m) => m.TeamPage),
  },
  {
    path: '**',
    title: `Página não encontrada — ${APP_NAME}`,
    loadComponent: () => import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
  },
];
