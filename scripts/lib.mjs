/**
 * Utilidades e configuração dos jogos, compartilhadas pelos geradores.
 * Um jogo novo entra aqui e no `GAMES` de `src/app/core/data/games.ts`.
 */
import { readFile } from 'node:fs/promises';

export const API = 'https://pokeapi.co/api/v2';
export const CONCURRENCY = 8;
/** Último Pokémon da geração 4 — o índice nacional vai até aqui. */
export const LAST_NATIONAL_ID = 493;

/**
 * `key` é o prefixo dos arquivos gerados (`frlg-moves.ts`). `ids` diz para
 * quais Pokémon gerar: um intervalo fixo, ou `'available'` para usar a lista
 * de obtíveis que o gerador de locais escreve (`hgss-available.ts`).
 * `unobtainable` tira da lista quem a PokeAPI mostra no jogo mas que, sem
 * troca com outro cartucho ou evento, não se consegue.
 */
export const GAMES = {
  frlg: {
    key: 'frlg',
    versionGroup: 'firered-leafgreen',
    versions: ['firered', 'leafgreen'],
    generation: 3,
    ids: { from: 1, to: 151 },
  },
  hgss: {
    key: 'hgss',
    versionGroup: 'heartgold-soulsilver',
    versions: ['heartgold', 'soulsilver'],
    generation: 4,
    ids: 'available',
    unobtainable: {
      384: 'Rayquaza: precisa de Kyogre e Groudon juntos, um de cada versão',
      483: 'Dialga: só com o Arceus de evento, nas Sinjoh Ruins',
      484: 'Palkia: só com o Arceus de evento, nas Sinjoh Ruins',
      487: 'Giratina: só com o Arceus de evento, nas Sinjoh Ruins',
    },
  },
};

/** Lê o jogo do primeiro argumento (`node scripts/x.mjs hgss`). */
export function gameFromArgs() {
  const key = process.argv[2];
  const game = GAMES[key];
  if (!game) {
    console.error(`Uso: node ${process.argv[1]} <${Object.keys(GAMES).join('|')}>`);
    process.exit(1);
  }
  return game;
}

export function range(from, to) {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

/** Ids do jogo: intervalo fixo ou a lista de obtíveis já gerada. */
export async function idsFor(game) {
  if (game.ids !== 'available') {
    return range(game.ids.from, game.ids.to);
  }
  const path = new URL(`../src/app/core/data/${game.key}-available.ts`, import.meta.url);
  const source = await readFile(path, 'utf8').catch(() => {
    throw new Error(`Rode antes: node scripts/generate-encounters.mjs ${game.key}`);
  });
  const list = /\[([\d,\s]+)\]/.exec(source)?.[1] ?? '';
  return list
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export async function getJson(url) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url);
    if (response.ok) {
      return response.json();
    }
    if (attempt >= 4) {
      throw new Error(`PokeAPI ${response.status} em ${url}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }
}

export async function mapWithConcurrency(items, worker, limit = CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

/** Literal de string TS com aspas simples. */
export function str(value) {
  return value === null ? 'null' : `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

export function idFromUrl(url) {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : null;
}
