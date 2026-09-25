# Prompt — UI do Pokémon Team Builder (somente frontend)

> Use este prompt numa sessão dedicada só à interface. Não implemente backend aqui.

---

## Papel

Você é um engenheiro frontend sênior especializado em Angular moderno e design
systems. Carregue as skills de frontend disponíveis nesta sessão antes de
começar (`modern-web-guidance`, `dataviz` se houver gráficos, `artifact-design`
para fundamentos visuais) e siga-as.

## Antes de escrever qualquer código: me interrogue (grill me)

Se a skill `grill-me` (marketplace `mattpocock/skills`) estiver instalada, **eu**
vou invocá-la com `/grill-me` — ela é user-invoked e você não consegue chamá-la
sozinho. Nesse caso, use as perguntas abaixo como pauta da entrevista.

Se ela não estiver disponível, conduza a entrevista você mesmo: não gere nenhum
arquivo antes de me fazer as perguntas abaixo e receber as respostas. Faça-as em
uma única rodada, agrupadas, com uma recomendação sua ao lado de cada uma para eu
só confirmar:

1. **Escopo de telas do MVP** — Pokédex (grid dos 151), detalhe do Pokémon,
   builder do time (6 slots) e análise de cobertura de tipos. Alguma sobra ou
   falta?
2. **Persistência do time no frontend** — `localStorage` por enquanto, ou
   assumir que o backend vai salvar e deixar a chamada mockada?
3. **Compartilhamento de time** — precisa de URL compartilhável (time
   codificado na query string) no MVP?
4. **Tema** — dark e light com toggle, ou só dark?
5. **Identidade visual** — shadcn neutro (cinza/zinc, raio 0.5rem) ou puxar
   acentos das cores de tipo de Pokémon?
6. **Sprites** — sprites pixelados oficiais da PokeAPI, artwork oficial em alta
   resolução, ou os dois (pixel na lista, artwork no detalhe)?
7. **Idioma da interface** — português, inglês, ou i18n desde o começo?
8. **Responsividade** — mobile-first de verdade (o builder tem que funcionar no
   celular) ou desktop primeiro?
9. **Testes** — quer testes de componente (Vitest/Jest + Testing Library) já
   nesta fase?
10. **Dados** — nesta fase eu consumo a PokeAPI direto do Angular, ou uso
    fixtures locais e deixo um `PokemonService` com a interface pronta para
    trocar pelo backend Spring depois?

Se eu não responder alguma, adote a sua recomendação, declare a suposição no
começo da resposta e siga em frente.

## Contexto do produto

Site para montar times de Pokémon **apenas da geração 1** (Pokédex nacional
#1–#151, Bulbasaur a Mew). Fonte de dados: **PokeAPI** (`https://pokeapi.co/api/v2/`).
O usuário monta um time de até 6 Pokémon e vê imediatamente as forças e
fraquezas do time.

## Stack desta fase

- **Angular** (última versão estável), standalone components, `signal()` para
  estado, novo control flow (`@if` / `@for` / `@switch`), `inject()` no lugar de
  constructor injection, `ChangeDetectionStrategy.OnPush`, lazy loading por rota.
- **TypeScript strict** (`strict: true`, sem `any`).
- **Tailwind CSS** + estilo **shadcn/ui**. Em Angular isso significa **spartan/ui
  (`@spartan-ng/ui-*`)**, que é a porta oficial do shadcn — componentes copiados
  para dentro do projeto, não uma dependência fechada. Se preferir não adicionar
  spartan, construa os primitivos à mão (button, card, dialog, select, badge,
  tooltip, skeleton, input, tabs) seguindo as mesmas convenções: tokens CSS em
  `:root`, variantes via `class-variance-authority`, `cn()` com
  `tailwind-merge`.
- Sem backend: `PokemonService` é a única porta de saída de dados. Ele deve ser
  trocável por chamadas ao Spring Boot depois sem tocar nos componentes.

## Telas

### 1. Pokédex (rota `/pokedex`, tela inicial)
- Grid responsivo de cards dos 151 Pokémon (2 colunas no mobile → 6 no desktop).
- Card: sprite, número (`#001`), nome, badges de tipo com as cores canônicas.
- Busca por nome/número com debounce, filtro por tipo (multi-seleção),
  ordenação por número / nome / stat total.
- Estados de `loading` (skeletons, não spinner), vazio e erro sempre tratados.
- Botão "adicionar ao time" direto no card, desabilitado quando o time está cheio
  ou o Pokémon já está nele.

### 2. Detalhe do Pokémon (rota `/pokemon/:id`)
- Artwork grande, tipos, altura, peso, habilidades, descrição da Pokédex.
- Base stats com barras horizontais (HP, Atk, Def, SpA, SpD, Spe) e o total.
- Eficácia de tipos: contra o que ele é fraco, resistente e imune (4x, 2x,
  0.5x, 0.25x, 0x).
- Linha evolutiva navegável.

### 3. Team Builder (rota `/team`)
- 6 slots. Slot vazio é um card tracejado clicável que abre um dialog de busca.
- Slot preenchido: sprite, nome, tipos, botão remover e link para o detalhe.
- Reordenação por drag-and-drop (Angular CDK).
- Painel lateral (embaixo no mobile) com a **análise do time**:
  - Matriz de cobertura defensiva: para cada um dos 18 tipos, quantos membros do
    time são fracos / resistentes / imunes.
  - Destaque para fraquezas comuns (≥ 3 membros fracos ao mesmo tipo) e para
    tipos sem nenhuma resistência no time.
  - Cobertura ofensiva pelos tipos dos membros.
  - Média dos base stats do time.
- Ações: limpar time, salvar, compartilhar.

### 4. Layout global
- Header com logo, navegação, toggle de tema e contador do time (`3/6`).
- Rota 404 com visual próprio.

## Regras de qualidade

- **Acessibilidade**: navegação por teclado completa, foco visível, labels ARIA,
  contraste AA, `prefers-reduced-motion` respeitado. Nunca use cor sozinha para
  transmitir informação (a matriz de tipos precisa de texto/ícone também).
- **Performance**: `trackBy`/`track` em todas as listas, imagens com
  `loading="lazy"` e `width`/`height` fixos para não causar layout shift,
  virtual scroll se o grid passar de ~150 itens renderizados.
- **Tema**: tokens de cor em CSS custom properties no `:root`, redefinidos para
  dark mode. Nada de cor hardcoded em componente.
- **Design**: espaçamento consistente numa escala de 4px, no máximo duas
  famílias tipográficas, transições curtas (150–200ms). Denso e informativo,
  não inflado — a tela do builder tem que caber sem scroll infinito no desktop.

## Entregáveis

1. Projeto Angular rodando com `npm start`.
2. Estrutura de pastas por feature (`src/app/features/pokedex`,
   `features/team`, `core/`, `shared/ui/`).
3. `PokemonService` com tipos TypeScript completos para as respostas da PokeAPI
   que você usa (não tipagem genérica).
4. Tabela de eficácia de tipos da geração 1 como dado tipado em
   `core/data/type-chart.ts`, com a função de cálculo isolada e testável.
5. `README` curto: como rodar, decisões de UI e o que ficou pendente.

## Fora de escopo nesta fase

Spring Boot, banco de dados, autenticação, gerações 2+, movimentos/movesets,
cálculo de dano, EVs/IVs/naturezas. Não crie nada disso "por adiantamento".

## Como trabalhar

Responda primeiro com as perguntas da seção "grill me" (ou espere o
`/grill-me`, se eu o invocar). Depois das respostas,
mostre um plano curto (estrutura de pastas + ordem de implementação) e só então
comece a escrever código, commitando em etapas coerentes.
