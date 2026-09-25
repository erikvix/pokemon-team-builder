import { describe, expect, it } from 'vitest';
import type { PokemonSummary } from '../models/pokemon.model';
import { filterPokemon, matchesQuery, normalize } from './pokemon-filter';

function make(
  id: number,
  name: string,
  types: PokemonSummary['types'],
  total: number,
): PokemonSummary {
  return {
    id,
    name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    types,
    stats: { hp: 1, attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
    statTotal: total,
    spriteUrl: '',
    artworkUrl: '',
  };
}

const LIST: readonly PokemonSummary[] = [
  make(1, 'bulbasaur', ['grass', 'poison'], 318),
  make(4, 'charmander', ['fire'], 309),
  make(25, 'pikachu', ['electric'], 320),
  make(150, 'mewtwo', ['psychic'], 680),
];

describe('normalize', () => {
  it('remove acento, caixa e espaços das pontas', () => {
    expect(normalize('  Pokémon  ')).toBe('pokemon');
  });
});

describe('matchesQuery', () => {
  const pikachu = LIST[2]!;

  it('casa por trecho do nome', () => {
    expect(matchesQuery(pikachu, 'pika')).toBe(true);
    expect(matchesQuery(pikachu, 'chu')).toBe(true);
    expect(matchesQuery(pikachu, 'bulba')).toBe(false);
  });

  it('casa por número com ou sem zeros à esquerda e com #', () => {
    expect(matchesQuery(pikachu, '25')).toBe(true);
    expect(matchesQuery(pikachu, '025')).toBe(true);
    expect(matchesQuery(pikachu, '#025')).toBe(true);
    expect(matchesQuery(pikachu, '26')).toBe(false);
  });

  it('busca vazia casa com tudo', () => {
    expect(matchesQuery(pikachu, '   ')).toBe(true);
  });
});

describe('filterPokemon', () => {
  it('filtra por tipo aceitando qualquer um dos selecionados', () => {
    const result = filterPokemon(LIST, { query: '', types: ['fire', 'electric'], sort: 'number' });
    expect(result.map((p) => p.id)).toEqual([4, 25]);
  });

  it('combina busca e tipo', () => {
    const result = filterPokemon(LIST, { query: 'char', types: ['fire'], sort: 'number' });
    expect(result.map((p) => p.id)).toEqual([4]);
  });

  it('ordena por nome e por total de stats', () => {
    expect(
      filterPokemon(LIST, { query: '', types: [], sort: 'name' }).map((p) => p.displayName),
    ).toEqual(['Bulbasaur', 'Charmander', 'Mewtwo', 'Pikachu']);

    expect(filterPokemon(LIST, { query: '', types: [], sort: 'stats' }).map((p) => p.id)).toEqual([
      150, 25, 1, 4,
    ]);
  });

  it('mantém a ordem da Pokédex por padrão e não muta a lista', () => {
    const result = filterPokemon(LIST, { query: '', types: [], sort: 'number' });
    expect(result.map((p) => p.id)).toEqual([1, 4, 25, 150]);
    expect(LIST.map((p) => p.id)).toEqual([1, 4, 25, 150]);
  });

  it('devolve vazio quando nada casa', () => {
    expect(filterPokemon(LIST, { query: 'ditto', types: [], sort: 'number' })).toEqual([]);
  });
});
