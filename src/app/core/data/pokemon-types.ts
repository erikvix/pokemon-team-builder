/** Os 18 tipos do jogo, na ordem canônica da Pokédex. */
export const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
] as const;

export type PokemonType = (typeof POKEMON_TYPES)[number];

const TYPE_SET: ReadonlySet<string> = new Set<string>(POKEMON_TYPES);

export function isPokemonType(value: string): value is PokemonType {
  return TYPE_SET.has(value);
}

/** Rótulos em português usados em toda a interface. */
export const TYPE_LABEL: Readonly<Record<PokemonType, string>> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  electric: 'Elétrico',
  grass: 'Planta',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Venenoso',
  ground: 'Terrestre',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Aço',
  fairy: 'Fada',
};

/**
 * Nome da custom property com a cor do tipo (definida em `styles.css`).
 * Mantém a cor fora dos componentes e permite tema claro/escuro.
 */
export function typeColorVar(type: PokemonType): string {
  return `var(--type-${type})`;
}
