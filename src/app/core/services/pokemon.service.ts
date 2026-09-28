import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  Observable,
  catchError,
  defer,
  forkJoin,
  map,
  of,
  shareReplay,
  switchMap,
  throwError,
} from 'rxjs';
import type { GameLearnset, GameMove } from '../data/game-data.model';
import { findGame, type GameId } from '../data/games';
import { NATIONAL_POKEDEX } from '../data/national-pokedex';
import { isPokemonType, type PokemonType } from '../data/pokemon-types';
import { artworkUrl, displayName, spriteUrl } from '../data/sprites';
import type {
  PokeApiChainLink,
  PokeApiEvolutionChain,
  PokeApiEvolutionDetail,
  PokeApiPokemon,
  PokeApiSpecies,
} from '../models/pokeapi.model';
import {
  statTotal,
  type BaseStats,
  type EvolutionStage,
  type MoveLearnMethod,
  type PokemonAbility,
  type PokemonDetail,
  type PokemonEncounter,
  type PokemonMove,
  type PokemonMoveset,
  type PokemonSummary,
} from '../models/pokemon.model';

const API_BASE = 'https://pokeapi.co/api/v2';

/** Erro de domínio: os componentes não conhecem `HttpErrorResponse`. */
export class PokemonDataError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PokemonDataError';
  }
}

interface MovesModule {
  readonly MOVES: Readonly<Record<string, GameMove>>;
  readonly LEARNSETS: Readonly<Record<number, GameLearnset>>;
}

interface EncountersModule {
  readonly ENCOUNTERS: Readonly<Record<number, readonly PokemonEncounter[]>>;
}

/**
 * Índices gerados de cada jogo. Os `import()` ficam literais para o bundler
 * separar um chunk por arquivo.
 */
const GAME_DATA: Readonly<
  Record<GameId, { moves: () => Promise<MovesModule>; encounters: () => Promise<EncountersModule> }>
> = {
  'firered-leafgreen': {
    moves: () => import('../data/frlg-moves'),
    encounters: () => import('../data/frlg-encounters'),
  },
  'heartgold-soulsilver': {
    moves: () => import('../data/hgss-moves'),
    encounters: () => import('../data/hgss-encounters'),
  },
};

/** `defer`: o chunk só baixa na primeira inscrição, e fica em cache depois. */
function cachedImport<T>(
  cache: Map<GameId, Observable<T>>,
  gameId: GameId,
  load: () => Promise<T>,
  what: string,
): Observable<T> {
  let data = cache.get(gameId);
  if (!data) {
    data = defer(load).pipe(
      catchError((error: unknown) => {
        // Falhou (rede caiu no meio do download): a próxima tentativa refaz.
        cache.delete(gameId);
        return throwError(() => new PokemonDataError(`Não foi possível carregar ${what}.`, error));
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    cache.set(gameId, data);
  }
  return data;
}

const ITEM_LABEL: Readonly<Record<string, string>> = {
  'fire-stone': 'Pedra do Fogo',
  'water-stone': 'Pedra da Água',
  'thunder-stone': 'Pedra do Trovão',
  'leaf-stone': 'Pedra da Folha',
  'moon-stone': 'Pedra da Lua',
  'sun-stone': 'Pedra do Sol',
};

/**
 * Única porta de saída de dados do app.
 *
 * A listagem vem de um índice versionado (`national-pokedex.ts`, #001–#493),
 * gerado a partir da PokeAPI — evita centenas de requisições no primeiro
 * load; cada jogo enxerga só os seus Pokémon. Ataques e locais vêm de índices
 * gerados por jogo, carregados sob demanda. O detalhe vem da API ao vivo. Quando o backend Spring existir, basta trocar as URLs (ou a
 * implementação inteira) aqui: nenhum componente conhece a PokeAPI.
 */
@Injectable({ providedIn: 'root' })
export class PokemonService {
  private readonly http = inject(HttpClient);
  private readonly detailCache = new Map<number, Observable<PokemonDetail>>();
  /** Índices por jogo, baixados só quando alguém abre ataques ou locais. */
  private readonly movesData = new Map<GameId, Observable<MovesModule>>();
  private readonly encountersData = new Map<GameId, Observable<EncountersModule>>();

  private readonly summaries: readonly PokemonSummary[] = NATIONAL_POKEDEX.map((entry) => ({
    id: entry.id,
    name: entry.name,
    displayName: displayName(entry.name),
    types: entry.types,
    stats: entry.stats,
    statTotal: statTotal(entry.stats),
    spriteUrl: spriteUrl(entry.id),
    artworkUrl: artworkUrl(entry.id),
  }));

  private readonly byId = new Map<number, PokemonSummary>(
    this.summaries.map((summary) => [summary.id, summary]),
  );

  /**
   * Os Pokémon do jogo, em ordem de Pokédex nacional.
   *
   * Assíncrono de propósito: hoje resolve na hora (índice local), mas a
   * assinatura já é a que o backend Spring vai ter, então as telas tratam
   * carregando/erro desde agora.
   */
  list(gameId: GameId): Observable<readonly PokemonSummary[]> {
    return of(this.listSync(gameId));
  }

  /**
   * Acesso direto ao índice local, sem passar por `Observable`. Existe porque
   * o índice é local e síncrono; some junto com ele quando o backend entrar.
   */
  listSync(gameId: GameId): readonly PokemonSummary[] {
    return this.getSummaries(findGame(gameId)?.pokemonIds ?? []);
  }

  /** Busca pontual no índice nacional (#001–#493), sem filtrar por jogo. */
  getSummary(id: number): PokemonSummary | undefined {
    return this.byId.get(id);
  }

  /** Resolve vários ids de uma vez, ignorando os inexistentes. */
  getSummaries(ids: readonly number[]): readonly PokemonSummary[] {
    return ids
      .map((id) => this.byId.get(id))
      .filter((summary): summary is PokemonSummary => summary !== undefined);
  }

  /** Detalhe completo, com cache por id enquanto a aba estiver aberta. */
  getDetail(id: number): Observable<PokemonDetail> {
    const cached = this.detailCache.get(id);
    if (cached) {
      return cached;
    }

    const request = this.http.get<PokeApiPokemon>(`${API_BASE}/pokemon/${id}`).pipe(
      switchMap((pokemon) =>
        forkJoin({
          pokemon: of(pokemon),
          species: this.http
            .get<PokeApiSpecies>(`${API_BASE}/pokemon-species/${id}`)
            .pipe(catchError(() => of(null))),
        }),
      ),
      switchMap(({ pokemon, species }) => {
        const chainUrl = species?.evolution_chain?.url;
        const chain$ = chainUrl
          ? this.http
              .get<PokeApiEvolutionChain>(chainUrl)
              .pipe(catchError(() => of(null as PokeApiEvolutionChain | null)))
          : of(null);
        return chain$.pipe(map((chain) => this.toDetail(pokemon, species, chain)));
      }),
      catchError((error: unknown) => throwError(() => this.toDomainError(error, id))),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.detailCache.set(id, request);
    return request;
  }

  /**
   * Golpes que o Pokémon aprende no jogo, com poder, precisão e PP daquele
   * jogo. Vem de um índice gerado (`<jogo>-moves.ts`), carregado sob demanda.
   */
  getMoves(id: number, gameId: GameId): Observable<PokemonMoveset> {
    return this.moves(gameId).pipe(
      map(({ MOVES, LEARNSETS }) => {
        const learnset = LEARNSETS[id];
        if (!learnset) {
          throw new PokemonDataError(`Não encontramos os ataques do Pokémon #${id} nesse jogo.`);
        }
        return toMoveset(learnset, MOVES);
      }),
    );
  }

  /**
   * Onde o Pokémon aparece no jogo, do menor nível para o maior. Lista vazia
   * quando ele só vem por evolução, reprodução, troca ou evento.
   */
  getEncounters(id: number, gameId: GameId): Observable<readonly PokemonEncounter[]> {
    return this.encounters(gameId).pipe(
      map(({ ENCOUNTERS }) => {
        const encounters = ENCOUNTERS[id];
        if (!encounters) {
          throw new PokemonDataError(`Não encontramos os locais do Pokémon #${id} nesse jogo.`);
        }
        return encounters;
      }),
    );
  }

  private moves(gameId: GameId): Observable<MovesModule> {
    return cachedImport(this.movesData, gameId, GAME_DATA[gameId].moves, 'os ataques');
  }

  private encounters(gameId: GameId): Observable<EncountersModule> {
    return cachedImport(
      this.encountersData,
      gameId,
      GAME_DATA[gameId].encounters,
      'onde encontrar',
    );
  }

  private toDomainError(error: unknown, id: number): PokemonDataError {
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return new PokemonDataError(`Não encontramos o Pokémon #${id}.`, error);
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return new PokemonDataError('Sem conexão com a PokeAPI. Verifique sua rede.', error);
    }
    return new PokemonDataError('Não foi possível carregar os dados da PokeAPI.', error);
  }

  private toDetail(
    pokemon: PokeApiPokemon,
    species: PokeApiSpecies | null,
    chain: PokeApiEvolutionChain | null,
  ): PokemonDetail {
    const summary = this.byId.get(pokemon.id);
    const types = summary?.types ?? this.readTypes(pokemon);
    const stats = summary?.stats ?? this.readStats(pokemon);

    return {
      id: pokemon.id,
      name: pokemon.name,
      displayName: displayName(pokemon.name),
      types,
      stats,
      statTotal: statTotal(stats),
      spriteUrl: pokemon.sprites.front_default ?? spriteUrl(pokemon.id),
      artworkUrl:
        pokemon.sprites.other?.['official-artwork']?.front_default ?? artworkUrl(pokemon.id),
      height: pokemon.height,
      weight: pokemon.weight,
      abilities: this.readAbilities(pokemon),
      flavorText: this.readFlavorText(species),
      genus: this.readGenus(species),
      evolutionLine: chain ? this.flattenChain(chain.chain, 0) : [],
    };
  }

  private readTypes(pokemon: PokeApiPokemon): readonly PokemonType[] {
    return [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => entry.type.name)
      .filter(isPokemonType);
  }

  private readStats(pokemon: PokeApiPokemon): BaseStats {
    const read = (name: string): number =>
      pokemon.stats.find((entry) => entry.stat.name === name)?.base_stat ?? 0;
    return {
      hp: read('hp'),
      attack: read('attack'),
      defense: read('defense'),
      specialAttack: read('special-attack'),
      specialDefense: read('special-defense'),
      speed: read('speed'),
    };
  }

  private readAbilities(pokemon: PokeApiPokemon): readonly PokemonAbility[] {
    return [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((entry) => ({
        name: entry.ability.name,
        displayName: displayName(entry.ability.name),
        isHidden: entry.is_hidden,
      }));
  }

  /**
   * A PokeAPI não tem entradas em português; cai para inglês e normaliza as
   * quebras de linha que os jogos antigos embutem no texto.
   */
  private readFlavorText(species: PokeApiSpecies | null): string | null {
    const entry = species?.flavor_text_entries.find((item) => item.language.name === 'en');
    if (!entry) {
      return null;
    }
    return entry.flavor_text
      .replace(/[\n\f\r­]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private readGenus(species: PokeApiSpecies | null): string | null {
    return species?.genera.find((item) => item.language.name === 'en')?.genus ?? null;
  }

  private flattenChain(link: PokeApiChainLink, stage: number): readonly EvolutionStage[] {
    const id = idFromSpeciesUrl(link.species.url);
    const detail = link.evolution_details[0];
    const current: EvolutionStage[] =
      id === null
        ? []
        : [
            {
              id,
              stage,
              name: link.species.name,
              displayName: displayName(link.species.name),
              spriteUrl: spriteUrl(id),
              minLevel: detail?.min_level ?? null,
              trigger: describeTrigger(detail),
            },
          ];

    return link.evolves_to.reduce<EvolutionStage[]>(
      (all, next) => [...all, ...this.flattenChain(next, stage + 1)],
      current,
    );
  }
}

function toMoveset(
  learnset: GameLearnset,
  moves: Readonly<Record<string, GameMove>>,
): PokemonMoveset {
  const build = (name: string, level: number | null = null): PokemonMove[] => {
    const move = moves[name];
    if (!move) {
      return [];
    }
    return [
      {
        name,
        displayName: displayName(name),
        type: move.type,
        category: move.category,
        power: move.power,
        accuracy: move.accuracy,
        pp: move.pp,
        description: move.description,
        level,
        machine: move.machine,
      },
    ];
  };
  const byName = (a: PokemonMove, b: PokemonMove): number =>
    a.displayName.localeCompare(b.displayName);
  // TM01…TM50 antes de HM01…HM08, como na bolsa do jogo.
  const machineRank = (move: PokemonMove): number => {
    const machine = move.machine ?? '';
    return (machine.startsWith('HM') ? 100 : 0) + (Number.parseInt(machine.slice(2), 10) || 0);
  };
  const byMachine = (a: PokemonMove, b: PokemonMove): number => machineRank(a) - machineRank(b);

  return {
    levelUp: learnset.levelUp.flatMap(([level, name]) => build(name, level)),
    machine: learnset.machine.flatMap((name) => build(name)).sort(byMachine),
    tutor: learnset.tutor.flatMap((name) => build(name)).sort(byName),
    egg: learnset.egg.flatMap((name) => build(name)).sort(byName),
  } satisfies Record<MoveLearnMethod, readonly PokemonMove[]>;
}

function idFromSpeciesUrl(url: string): number | null {
  const match = /\/pokemon-species\/(\d+)\/?$/.exec(url);
  const id = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(id) ? id : null;
}

function describeTrigger(detail: PokeApiEvolutionDetail | undefined): string | null {
  if (!detail) {
    return null;
  }
  const time =
    detail.time_of_day === 'day' ? ' (de dia)' : detail.time_of_day === 'night' ? ' (à noite)' : '';
  const itemName = (item: { name: string }): string =>
    ITEM_LABEL[item.name] ?? displayName(item.name);

  if (detail.min_level !== null) {
    return `Nível ${detail.min_level}${time}`;
  }
  if (detail.item) {
    return itemName(detail.item);
  }
  if (detail.trigger?.name === 'trade') {
    return detail.held_item ? `Troca segurando ${itemName(detail.held_item)}` : 'Troca';
  }
  if (detail.min_happiness !== null) {
    return `Amizade alta${time}`;
  }
  if (detail.held_item) {
    return `Subir de nível segurando ${itemName(detail.held_item)}${time}`;
  }
  if (detail.known_move) {
    return `Subir de nível sabendo ${displayName(detail.known_move.name)}`;
  }
  if (detail.party_species) {
    return `Subir de nível com ${displayName(detail.party_species.name)} no time`;
  }
  if (detail.min_beauty) {
    return 'Beleza alta';
  }
  return detail.trigger?.name === 'level-up' ? 'Subir de nível' : null;
}
