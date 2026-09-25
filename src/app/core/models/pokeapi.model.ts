/**
 * Tipos das respostas da PokeAPI — só os campos que este app consome.
 * São o contrato externo: nada fora do `PokemonService` deve importá-los.
 */

export interface NamedApiResource {
  readonly name: string;
  readonly url: string;
}

export interface PokeApiPokemonType {
  readonly slot: number;
  readonly type: NamedApiResource;
}

export interface PokeApiPokemonStat {
  readonly base_stat: number;
  readonly effort: number;
  readonly stat: NamedApiResource;
}

export interface PokeApiPokemonAbility {
  readonly ability: NamedApiResource;
  readonly is_hidden: boolean;
  readonly slot: number;
}

export interface PokeApiSprites {
  readonly front_default: string | null;
  readonly other?: {
    readonly 'official-artwork'?: {
      readonly front_default: string | null;
    };
  };
}

/** `GET /pokemon/{id}` */
export interface PokeApiPokemon {
  readonly id: number;
  readonly name: string;
  /** Decímetros. */
  readonly height: number;
  /** Hectogramas. */
  readonly weight: number;
  readonly types: readonly PokeApiPokemonType[];
  readonly stats: readonly PokeApiPokemonStat[];
  readonly abilities: readonly PokeApiPokemonAbility[];
  readonly sprites: PokeApiSprites;
  readonly species: NamedApiResource;
}

export interface PokeApiFlavorTextEntry {
  readonly flavor_text: string;
  readonly language: NamedApiResource;
  readonly version: NamedApiResource;
}

export interface PokeApiGenus {
  readonly genus: string;
  readonly language: NamedApiResource;
}

/** `GET /pokemon-species/{id}` */
export interface PokeApiSpecies {
  readonly id: number;
  readonly name: string;
  readonly flavor_text_entries: readonly PokeApiFlavorTextEntry[];
  readonly genera: readonly PokeApiGenus[];
  readonly evolution_chain: { readonly url: string } | null;
}

export interface PokeApiEvolutionDetail {
  readonly min_level: number | null;
  readonly trigger: NamedApiResource | null;
  readonly item: NamedApiResource | null;
  readonly min_happiness: number | null;
}

export interface PokeApiChainLink {
  readonly species: NamedApiResource;
  readonly evolution_details: readonly PokeApiEvolutionDetail[];
  readonly evolves_to: readonly PokeApiChainLink[];
}

/** `GET /evolution-chain/{id}` */
export interface PokeApiEvolutionChain {
  readonly id: number;
  readonly chain: PokeApiChainLink;
}
