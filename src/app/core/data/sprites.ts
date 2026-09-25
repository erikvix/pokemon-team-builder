const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

/** Sprite pixelado oficial — usado em listas e slots do time. */
export function spriteUrl(id: number): string {
  return `${SPRITE_BASE}/${id}.png`;
}

/** Artwork oficial em alta resolução — usado na tela de detalhe. */
export function artworkUrl(id: number): string {
  return `${SPRITE_BASE}/other/official-artwork/${id}.png`;
}

/** `#001`, `#151` — número da Pokédex nacional formatado. */
export function pokedexNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`;
}

const NAME_OVERRIDES: Readonly<Record<string, string>> = {
  'nidoran-f': 'Nidoran♀',
  'nidoran-m': 'Nidoran♂',
  'mr-mime': 'Mr. Mime',
  farfetchd: "Farfetch'd",
};

/** `bulbasaur` → `Bulbasaur`, `mr-mime` → `Mr. Mime`. */
export function displayName(name: string): string {
  const override = NAME_OVERRIDES[name];
  if (override) {
    return override;
  }
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
