# Pokémon Team Builder

Monte times de até 6 Pokémon da **geração 1** (#001–#151) e veja na hora as
forças e fraquezas do time.

Fase atual: **só frontend**. Não há backend — `PokemonService` é a única porta
de dados e foi desenhado para ser trocado por chamadas ao Spring Boot depois,
sem tocar em componente nenhum.

## Como rodar

Requer Node `^22.22.3 || ^24.15.0 || >=26` (exigência do Angular 22).

```bash
npm install
npm start          # http://localhost:4200
npm test           # Vitest, uma passada
npm run build      # build de produção
npm run format     # Prettier
```

Regerar o índice da Pokédex a partir da PokeAPI (só quando precisar):

```bash
npm run generate:pokedex
npm run generate:moves     # ataques de FireRed/LeafGreen
```

## Stack

Angular 22 (standalone, `signal()`, novo control flow, `inject()`, `OnPush`,
lazy loading por rota), TypeScript `strict` sem `any`, Tailwind CSS v4 e
Angular CDK (drag-and-drop e dialog).

Os primitivos de UI seguem a convenção do **shadcn/ui**, mas escritos à mão
dentro do projeto (`src/app/shared/ui`), não como dependência: tokens de cor em
CSS custom properties no `:root`, variantes com `class-variance-authority` e
`cn()` com `tailwind-merge`. Optei por não adicionar o spartan/ui — para esse
punhado de primitivos (button, card, badge, input, skeleton, ícones) ele traria
mais superfície do que benefício, e a porta continua aberta: as classes são as
mesmas.

## Estrutura

```
src/app/
  core/
    data/        tipos, tabela de eficácia, índice gerado dos 151, sprites
    models/      domínio (PokemonSummary/Detail) e respostas da PokeAPI
    services/    PokemonService, TeamService, ThemeService, análise e filtros
  shared/
    ui/          primitivos shadcn (button, card, badge, input, skeleton, icon)
    components/  type-badge, stat-bar
  features/
    pokedex/         grid, card e filtros
    pokemon-detail/  ficha, stats, eficácia de tipos, linha evolutiva
    team/            slots, diálogo de busca, análise do time
    not-found/       404
public/games/       logos dos jogos em SVG
scripts/generate-pokedex.mjs
scripts/generate-moves.mjs
scripts/vectorize-logo.py
```

## Telas

| Rota           | O que faz                                                      |
| -------------- | -------------------------------------------------------------- |
| `/`            | Escolha do jogo — hoje só FireRed/LeafGreen; leva para `/team` |
| `/pokedex`     | Grid dos 151, busca com debounce, filtro por tipo, ordenação   |
| `/pokemon/:id` | Artwork, ficha, base stats, eficácia de tipos, linha evolutiva |
| `/team`        | 6 slots com drag-and-drop, análise do time e modal de ataques  |
| `*`            | 404 com visual próprio                                         |

## Decisões de UI

**Dados em duas fontes.** A listagem precisa de tipo e base stats dos 151. Ao
vivo isso custaria 151 requisições de ~270 kB no primeiro load, então o índice
é gerado uma vez (`scripts/generate-pokedex.mjs`) e versionado em
`core/data/gen1-pokedex.ts`. O detalhe continua vindo da PokeAPI em tempo real,
com cache por id na sessão. Mesmo assim `PokemonService.list()` devolve
`Observable`: a assinatura já é a que o backend vai ter, e as telas tratam
carregando/vazio/erro desde agora.

**Tabela de tipos da geração 6+, não a da 1.** O painel de análise pede a
matriz dos **18 tipos** e as faixas 4x/2x/½x/¼x/0x — a tabela original da gen 1
tem 15 tipos (sem Sombrio, Aço e Fada) e algumas relações diferentes
(Inseto > Venenoso, Fantasma sem efeito em Psíquico, Gelo neutro contra Fogo).
Escolhi a tabela vigente porque é a que casa com o que a tela pede e com o que
o jogador espera hoje. Ela está isolada em `core/data/type-chart.ts` com as
funções de cálculo puras e testadas — trocar pela tabela legada é mexer em um
arquivo só.

**Cor nunca sozinha.** As cores canônicas de tipo aparecem como ponto e fundo
tênue; o texto usa `--foreground` para garantir contraste AA nos dois temas. Na
matriz de cobertura cada célula traz o número, e as fraquezas comuns vêm com
ícone de alerta além do destaque de fundo.

**Teclado é caminho de primeira classe.** Reordenar slots tem setas em cada
card além do drag-and-drop (arrastar sozinho não é acessível). O diálogo de
busca fecha no Esc, escolhe o primeiro resultado no Enter e devolve o foco para
onde estava. Tem link "pular para o conteúdo" e foco visível em tudo.

**Renderização incremental em vez de virtual scroll.** O grid entrega 48 cards
por vez com um botão "Mostrar mais". Com 151 itens, isso mantém o DOM pequeno
sem o custo do `cdk-virtual-scroll-viewport`, que exige altura de linha fixa e
brigaria com o número de colunas variando de 2 a 6.

**Persistência e compartilhamento.** O time vive em `localStorage` (só os ids)
e volta sozinho no próximo acesso — o botão "Salvar" apenas confirma isso em
voz alta. "Compartilhar" copia uma URL com o time na query string
(`/team?time=6-9-3-25`), que qualquer pessoa abre direto montado.

**O logo do jogo é SVG vetorizado, não bitmap.** `public/games/firered.svg`
saiu de um traçado por camadas de cor do logo oficial: cada cor vira um `path`,
os dois blocos ("Pokémon" e "FireRed Version") são separados por componente
conexo e cada um tem sua ordem de pintura, com máscara cumulativa para não
abrir fresta entre camadas. São 57 kB (21 kB com gzip) que escalam em qualquer
densidade de tela. `scripts/vectorize-logo.py` fica versionado para o arquivo
ser reproduzível — ele não roda no build.

O `alt` da imagem é vazio de propósito: o nome do jogo já está no título ao
lado, e repetir causaria leitura dupla no leitor de tela.

**A home é uma escolha de jogo.** A entrada do app não é mais a Pokédex: é um
card único do FireRed/LeafGreen que leva ao builder. Os jogos vivem numa lista
tipada (`features/home/game.model.ts`), então acrescentar outro é adicionar uma
entrada — não mexer na tela. A Pokédex continua acessível pelo header e por um
atalho na própria home.

**Tema.** Claro e escuro com toggle no header; a classe `dark` é aplicada por
um script inline no `index.html` antes do primeiro paint, para não piscar.
Respeita `prefers-color-scheme` na primeira visita e `prefers-reduced-motion`
em todas as transições.

**Idioma.** Interface toda em português, sem camada de i18n (seria peso morto
agora). Os textos da Pokédex vêm em inglês porque a PokeAPI não tem versão em
português — a tela avisa isso embaixo do texto.

## Testes

`npm test` roda 52 testes no Vitest, concentrados onde erro é caro e silencioso:
tabela de tipos, análise de time, filtros da Pokédex, `TeamService` (limites,
duplicados, reordenação, persistência, código de compartilhamento) e dois
componentes (shell e card da Pokédex).

## Pendências

- Testes end-to-end (Playwright) — a verificação dos fluxos foi manual.
- Auditoria de acessibilidade com ferramenta (axe) e com leitor de tela real.
- O drag-and-drop não reordena por teclado dentro do próprio CDK; a alternativa
  são as setas de cada slot.
- O diálogo de busca não filtra por tipo, só por nome/número.
- Sem PWA/offline: o detalhe depende da PokeAPI estar no ar.
- Troca do índice local pelo backend Spring quando ele existir (mexe só em
  `PokemonService`).

## Marcas

Pokémon, os nomes das criaturas e os logos dos jogos são marcas registradas da
Nintendo / Creatures / GAME FREAK. Os sprites vêm da PokeAPI e o logo em
`public/games/` é derivado do material oficial. Isto é um projeto de fã, sem
fins comerciais e sem vínculo com os detentores dos direitos — vale rever esse
ponto antes de qualquer uso comercial.

## Fora de escopo nesta fase

Spring Boot, banco, autenticação, gerações 2+, movesets, cálculo de dano e
EVs/IVs/naturezas.
