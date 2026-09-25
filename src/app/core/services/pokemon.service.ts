import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap, throwError } from 'rxjs';
import { GEN1_POKEDEX } from '../data/gen1-pokedex';
import { isPokemonType, type PokemonType } from '../data/pokemon-types';
import { artworkUrl, displayName, spriteUrl } from '../data/sprites';
import type {
  PokeApiChainLink,
  PokeApiEvolutionChain,
  PokeApiPokemon,
  PokeApiSpecies,
} from '../models/pokeapi.model';
import {
  statTotal,
  type BaseStats,
  type EvolutionStage,
  type PokemonAbility,
  type PokemonDetail,
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

const ITEM_LABEL: Readonly<Record<string, string>> = {
  'fire-stone': 'Pedra do Fogo',
  'water-stone': 'Pedra da Água',
  'thunder-stone': 'Pedra do Trovão',
  'leaf-stone': 'Pedra da Folha',
  'moon-stone': 'Pedra da Lua',
};

/**
 * Única porta de saída de dados do app.
 *
 * A listagem dos 151 vem de um índice versionado (`gen1-pokedex.ts`), gerado
 * a partir da PokeAPI — evita 151 requisições no primeiro load. O detalhe vem
 * da API ao vivo. Quando o backend Spring existir, basta trocar as URLs (ou a
 * implementação inteira) aqui: nenhum componente conhece a PokeAPI.
 */
@Injectable({ providedIn: 'root' })
export class PokemonService {
  private readonly http = inject(HttpClient);
  private readonly detailCache = new Map<number, Observable<PokemonDetail>>();

  private readonly summaries: readonly PokemonSummary[] = GEN1_POKEDEX.map((entry) => ({
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
   * Os 151 da geração 1, em ordem de Pokédex.
   *
   * Assíncrono de propósito: hoje resolve na hora (índice local), mas a
   * assinatura já é a que o backend Spring vai ter, então as telas tratam
   * carregando/erro desde agora.
   */
  list(): Observable<readonly PokemonSummary[]> {
    return of(this.summaries);
  }

  /**
   * Acesso direto ao índice local, sem passar por `Observable`. Existe porque
   * o índice é local e síncrono; some junto com ele quando o backend entrar.
   */
  listAllSync(): readonly PokemonSummary[] {
    return this.summaries;
  }

  /** Busca pontual no índice local — usada para resolver ids do time. */
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
      artworkUrl: pokemon.sprites.other?.['official-artwork']?.front_default ?? artworkUrl(pokemon.id),
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
    return entry.flavor_text.replace(/[\n\f\r­]/g, ' ').replace(/\s+/g, ' ').trim();
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

function idFromSpeciesUrl(url: string): number | null {
  const match = /\/pokemon-species\/(\d+)\/?$/.exec(url);
  const id = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(id) ? id : null;
}

function describeTrigger(detail: { min_level: number | null; trigger: { name: string } | null; item: { name: string } | null; min_happiness: number | null } | undefined): string | null {
  if (!detail) {
    return null;
  }
  if (detail.min_level !== null) {
    return `Nível ${detail.min_level}`;
  }
  if (detail.item) {
    return ITEM_LABEL[detail.item.name] ?? displayName(detail.item.name);
  }
  if (detail.min_happiness !== null) {
    return 'Amizade alta';
  }
  switch (detail.trigger?.name) {
    case 'trade':
      return 'Troca';
    case 'level-up':
      return 'Subir de nível';
    default:
      return null;
  }
}
