# CLAUDE.md

## Referência de design

Antes de criar ou redesenhar telas, layouts ou componentes, consulte o
**Pokémon Database** — https://pokemondb.net — como referência visual e de
organização de conteúdo. Páginas úteis:

- Pokédex por jogo: https://pokemondb.net/pokedex/game/heartgold-soulsilver
  (troque o slug pelo jogo: `firered-leafgreen`, etc.)
- Ficha de um Pokémon: https://pokemondb.net/pokedex/pikachu
- Ataques: https://pokemondb.net/move/all
- Locais: https://pokemondb.net/location

Use o site como inspiração de layout (como a informação é agrupada, tabelas,
hierarquia), não como fonte para copiar textos, imagens ou marca. Os dados do
app continuam vindo da PokeAPI (índices gerados em `scripts/`). O visual segue
os primitivos do projeto (`src/app/shared/ui`, tokens em `src/styles.css`).

## Fluxo de trabalho

- Mudanças podem ir direto para a `main`, sem PR; se algo quebrar, desfaça com
  `git revert`.
- Antes do push: `npm test` e `npm run build` (Node ≥ 22.22.3 — o Angular 22
  recusa versões anteriores) e `npx prettier --check` nos arquivos alterados.
- Arquivos em `src/app/core/data/*-{moves,encounters,available,abilities}.ts` e
  `national-pokedex.ts` são gerados — edite os scripts em `scripts/` e regere.
- Textos da interface e comentários em português.
