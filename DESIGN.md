---
name: Smoking Tracker
description: Diário pessoal de redução de tabaco e cannabis, em blocos calmos sobre fundo noturno.
colors:
  primary: "hsl(240 20% 96%)"
  primary-foreground: "hsl(233 22% 14%)"
  tobacco: "hsl(21 100% 77%)"
  tobacco-foreground: "hsl(22 50% 10%)"
  cannabis: "hsl(165 59% 75%)"
  cannabis-foreground: "hsl(166 50% 10%)"
  background: "hsl(233 22% 14%)"
  card: "hsl(230 19% 18%)"
  muted: "hsl(227 17% 25%)"
  foreground: "hsl(240 20% 96%)"
  muted-foreground: "hsl(230 17% 73%)"
  destructive: "hsl(0 90% 77%)"
  destructive-foreground: "hsl(233 22% 14%)"
typography:
  display:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "3.25rem"
    fontWeight: 600
    lineHeight: "3.5rem"
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "1.75rem"
    fontFeature: "tnum"
  title-lg:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
    fontFeature: "tnum"
  body-strong:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
  input:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  caption:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
    fontFeature: "tnum"
rounded:
  micro: "3px"
  swatch: "5px"
  bar: "6px"
  sm: "10px"
  md: "14px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "hsl(240 20% 96% / 0.9)"
  button-secondary:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "hsl(227 17% 25% / 0.8)"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.muted}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "44px"
  log-button-tobacco:
    backgroundColor: "{colors.tobacco}"
    textColor: "{colors.tobacco-foreground}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "60px"
  log-button-cannabis:
    backgroundColor: "{colors.cannabis}"
    textColor: "{colors.cannabis-foreground}"
    typography: "{typography.title}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "60px"
  panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.input}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "44px"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    height: "56px"
  nav-item-active:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "56px"
  meter-segment:
    backgroundColor: "{colors.muted}"
    rounded: "{rounded.micro}"
    height: "10px"
  day-cell:
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "4px"
    height: "48px"
---

# Design System: Smoking Tracker

## Overview

**Creative North Star: "O Diário Noturno"**

Um diário privado e gentil, aberto à noite: blocos calmos sobre um fundo índigo escuro, sem nada que grite. O sistema substitui o neobrutalismo anterior e recusa o que ele tinha de painel de cobrança. Não há borda preta, não há sombra dura e nenhuma cor premia ou pune o consumo.

A hierarquia vem de três fontes: tom de superfície, tamanho do numeral e a presença rara de duas cores de série. Tudo que é ação fica neutro, então a cor na tela sempre significa "isto é tabaco" ou "isto é cannabis". A densidade é de painel de leitura rápida: blocos próximos, 8px entre si, com um número grande por vez e o resto em texto pequeno e tranquilo.

Um dia acima da meta aparece como dado, nunca como alarme. O medidor ganha um respiro, o calendário ganha uma textura e o texto segue em tinta normal.

**Key Characteristics:**
- Tema escuro único, com profundidade feita só de tom.
- Blocos planos de 16px, sem contorno e sem sombra.
- Duas cores de série e nenhuma cor de marca.
- Ações primárias neutras, em branco suave.
- Numerais tabulares em toda a interface.
- Um único movimento narrativo: o segmento do medidor acendendo.

## Colors

Uma noite índigo de baixa saturação, com dois pastéis luminosos reservados para os dados. Os valores normativos são os HSL de `src/index.css`; os hex abaixo são a renderização desses valores.

### Primary
- **Branco de Ação** (#F3F3F7): botões primários, seleção de texto e anel de foco. É a mesma tinta do texto, de propósito: a ação se destaca pelo contraste, não por um matiz.

### Secondary
- **Pêssego Tabaco** (#FFB38A): a série tabaco. Aparece nos numerais de Hoje como marcador, no medidor, nas barras, na legenda, no ícone de cada registro e no botão de registro. O texto sobre ele usa o marrom quase preto `tobacco-foreground` (#26160D).

### Tertiary
- **Menta Cannabis** (#9AE5D2): a série cannabis, nos mesmos papéis do pêssego. O texto sobre ela usa o verde quase preto `cannabis-foreground` (#0D2620).

### Neutral
- **Noite Índigo** (#1C1E2C): fundo da página, das barras fixas, do dock de registro e dos campos de texto. Também é a tinta sobre o Branco de Ação.
- **Bloco Grafite** (#252837): painéis, drawers, dialogs e o item ativo da navegação.
- **Ardósia** (#353A4B): botões secundários, controles sobre painel, toast, segmentos vazios do medidor, divisórias finas e contornos. Os tokens `muted`, `secondary`, `accent` e `border` são esta mesma cor.
- **Névoa Clara** (#F3F3F7): texto principal, numerais e linha de meta, esta com opacidade de 40%.
- **Névoa Lavanda** (#AEB2C6): texto de apoio, títulos de seção, rótulos de eixo e itens inativos da navegação.

### Semantic
- **Coral Suave** (#F99090): ações destrutivas e mensagens de erro de formulário. Nunca marca consumo nem meta ultrapassada.

### Named Rules
**The Cor de Série Rule.** Pêssego e menta existem só para dados e para os botões de registro. Dado inclui tudo que identifica um registro como tabaco ou cannabis: marcador, segmento, barra, legenda e o ícone do tipo na lista. Nenhum link, título, estado de navegação ou botão de outra função usa essas cores.

**The Ação Neutra Rule.** Toda ação primária é branca suave com tinta noturna: salvar, entrar, confirmar, inclusive o "Registrar" dentro do formulário de detalhes. Se uma ação não é o registro de um toque, ela não tem cor.

**The Sem Alarme Rule.** Passar da meta não muda nenhuma cor. O estado usa espaço no medidor, textura no calendário e texto em tinta normal. O coral fica para o que apaga dados.

## Typography

**Display Font:** Figtree (com system-ui, sans-serif)
**Body Font:** Figtree (com system-ui, sans-serif)

**Character:** Uma única família humanista e arredondada, nos pesos 400, 500 e 600. O contraste nasce do salto de tamanho entre numeral e rótulo, não de uma segunda fonte.

### Hierarchy
- **Display** (600, 3.25rem, altura de linha 3.5rem, espaçamento -0.02em): os dois numerais de Hoje, e só eles.
- **Headline** (600, 1.5rem, altura de linha 1.75rem): números de apoio, como média em 7 dias, sequência e dias na meta.
- **Title Large** (600, 1.125rem, altura de linha 1.375): a frase de tendência e os títulos de drawer e dialog.
- **Title** (600, 1rem, altura de linha 1.5rem): título de bloco, mês em navegação e rótulo dos botões de registro. O nome do app sobe para 1.25rem no mesmo peso.
- **Body** (400, 0.875rem, altura de linha 1.25rem): texto corrente e contexto dos registros. Na variante de peso 600, é rótulo de botão e título de linha.
- **Input** (400, 1rem, altura de linha 1.5rem): campos de texto. Os 16px evitam o zoom automático do iOS.
- **Label** (500, 0.875rem, altura de linha 1.25rem): títulos de seção em Névoa Lavanda, em caixa normal.
- **Caption** (500 na navegação e nos totais, 400 em eixos e cabeçalhos; 0.75rem, altura de linha 1rem): navegação inferior, totais sobre as barras, dias da semana e cabeçalho do calendário. É o menor tamanho do sistema.

### Named Rules
**The Numeral Tabular Rule.** Todo número usa algarismos tabulares, definidos no corpo da página. Contagens e horários se alinham em coluna e não tremem quando mudam.

**The Um Número Grande Rule.** O tamanho Display pertence às contagens de hoje. Nenhum outro dado disputa essa escala.

## Layout

No celular, o app é uma coluna única com margem lateral de 8px e blocos separados por 8px. O cabeçalho (64px) e a navegação inferior (72px) ficam fixos, somados às áreas seguras do aparelho. Em Hoje, os botões de registro ficam presos logo acima da navegação, ao alcance do polegar, e a página reserva espaço para eles.

No desktop, uma barra lateral fixa de 320px concentra registro, meta e dados, sob um cabeçalho de 64px com as abas Hoje e Histórico. O conteúdo forma duas colunas com 16px de intervalo, com largura máxima de 1152px, e os blocos dentro de cada coluna seguem a 8px. Metas não é uma página no desktop: o conteúdo vive na barra lateral.

O layout muda em largura de 768px com altura mínima de 500px, então um celular deitado mantém a versão móvel. O ritmo de espaçamento é de base 4: 8px entre blocos, 12px entre elementos de uma linha, 16px dentro dos blocos e 24px dentro de dialogs e da tela de login.

## Elevation & Depth

O sistema é plano e não usa sombras. Nenhum bloco, botão, drawer ou dialog leva `box-shadow`. A profundidade vem da escada tonal: Noite Índigo no fundo, Bloco Grafite nos painéis, Ardósia nos controles sobre eles. Barras fixas são opacas, na cor do fundo, sem desfoque. Drawers e dialogs se separam da página por um véu preto de 60% de opacidade.

### Named Rules
**The Bloco Plano Rule.** Painéis são planos, com 16px de raio, sem sombra e sem contorno. Para destacar algo, suba um degrau de tom.

## Shapes

As formas são suaves sem chegar à pílula, e o raio diminui com o tamanho do elemento. Blocos, botões de registro, dialogs, toasts e o topo dos drawers usam 16px. Botões, campos e itens de navegação usam 14px. Células do calendário e tooltips de gráfico usam 10px. Os menores marcadores têm raios próprios: 6px nas barras da semana, 5px nas amostras da legenda do calendário, 3px nos segmentos do medidor, marcadores de série e barras do gráfico mensal. Só a alça do drawer e o ponto de anotação são totalmente redondos.

Linhas de 1px em Ardósia aparecem apenas como estrutura interna: divisórias entre metades e linhas de um bloco, contorno de campos, botão outline e células do calendário.

## Components

### Buttons
Neutros, firmes e sem cerimônia.
- **Shape:** cantos suaves (14px), altura padrão de 44px.
- **Primary:** Branco de Ação com tinta noturna, rótulo em Body de peso 600, padding de 8px 16px.
- **Hover / Focus:** o fundo cai para 90% de opacidade. O foco é global: contorno de 2px em Névoa Clara, afastado 2px. Ao pressionar, o botão encolhe para 98% (95% em botões quadrados de ícone).
- **Secondary / Ghost / Outline:** Ardósia sólida; transparente com hover em Ardósia; transparente com contorno de 1px. Os botões de remoção são ghost e ganham coral só no hover.
- **Destructive:** coral sólido com tinta noturna, reservado à confirmação. Fora da confirmação, a ação destrutiva é texto coral sobre Ardósia ou direto sobre o fundo.

### Botões de registro
A única peça de ação com cor, porque é a própria série.
- **Móvel:** dois botões lado a lado, 60px de altura, raio de 16px, rótulo à esquerda e sinal de mais à direita. Um toque registra na hora.
- **Desktop:** 56px de altura na barra lateral, com ícone da série antes do rótulo. O clique abre o formulário de detalhes.
- **Fora do fluxo principal:** adicionar um uso dentro do dialog do dia é ação secundária e usa botão outline neutro.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Bloco Grafite.
- **Shadow Strategy:** nenhuma; ver Elevation & Depth.
- **Border:** nenhuma por fora. Divisões internas usam linha de 1px em Ardósia.
- **Internal Padding:** 16px; 24px em dialogs e na tela de login.

### Inputs / Fields
- **Style:** 44px de altura, fundo Noite Índigo, contorno de 1px em Ardósia, raio de 14px, texto de 16px.
- **Focus:** o contorno clareia para Névoa Clara a 60%, somado ao foco global.
- **Error / Disabled:** erro em linha com texto coral de peso 500; desabilitado a 50% de opacidade.

### Navigation
- **Móvel:** três itens na base, 56px de altura, ícone de 20px sobre Caption. Inativo em Névoa Lavanda; ativo sobre Bloco Grafite, em Névoa Clara e peso 600.
- **Desktop:** abas de texto de 40px no cabeçalho, com a mesma lógica de ativo. A navegação nunca usa cor de série.

### Drawers e Dialogs
Formulários abrem como drawer no celular e dialog no desktop, sempre sobre Bloco Grafite. O drawer tem alça central e topo arredondado em 16px. O dialog tem largura de 400px a 512px.

### Toast
Fundo Ardósia, sem contorno, raio de 16px. Fica acima do dock e da navegação para não cobrir os botões de registro. A ação principal, "Desfazer", usa a aparência primária.

### Medidor de Hoje
A assinatura do sistema: uma fileira de segmentos de 10px de altura, um por uso previsto até a meta, com 2px de intervalo e raio de 3px. Segmentos preenchidos seguem a ordem tabaco e depois cannabis; os vazios ficam em Ardósia. Usos além da meta entram depois de um respiro de 8px, sem mudar de cor. Acima de 24 posições, o medidor vira uma barra contínua.

**The Um Movimento Rule.** O sistema tem um único movimento autoral: o segmento acendendo, uma transição de cor de 500ms com saída suave, disparada quando um uso é registrado. O resto é resposta de estado (pressão, hover) ou entrada padrão de dialog, drawer e toast. Nada entra em cena, pulsa ou comemora.

### Gráficos e SeriesLegend
Barras empilhadas com tabaco na base e cannabis em cima, com 2px de separação entre as duas. A escala parte da meta, não do pico da semana, para que uma semana em queda pareça uma queda. A meta é uma linha fina em Névoa Clara a 40%, e o dia atual aparece em peso 600 no eixo.

**The Legenda Única Rule.** Todo gráfico das duas séries usa o componente `SeriesLegend`: marcador pêssego, marcador menta e, se houver limite, um traço com "meta N". Um gráfico novo reaproveita esse componente em vez de desenhar a própria legenda.

### Calendário
Células de 48px de altura e raio de 10px, com o dia em Caption e o total em 16px de peso 600. Dentro da meta é Ardósia sólida. Acima da meta é a textura diagonal em Névoa Clara a 22%, com contorno, para que o estado não dependa só de cor. Sem registro é apenas o contorno. Hoje recebe um anel de 2px em Névoa Clara.

## Do's and Don'ts

### Do:
- **Do** use pêssego e menta apenas em dados e nos botões de registro, conforme a Cor de Série Rule.
- **Do** mantenha toda ação primária em Branco de Ação com tinta noturna.
- **Do** crie hierarquia com o degrau de tom (Noite Índigo, Bloco Grafite, Ardósia) e com o tamanho do numeral.
- **Do** use `SeriesLegend` em qualquer gráfico novo das duas séries.
- **Do** mostre o excesso sobre a meta com espaço, textura ou texto em tinta normal.
- **Do** mantenha alvos de toque de 44px no celular.
- **Do** referencie os tokens por variável CSS; os HSL de `src/index.css` são a fonte da verdade.

### Don't:
- **Don't** use borda preta, sombra dura ou qualquer outro traço do neobrutalismo anterior.
- **Don't** adicione sombra ou contorno externo a um painel.
- **Don't** use cor para premiar ou punir o consumo; coral marca só destruição e erro.
- **Don't** pinte links, títulos, navegação ou ações comuns com cor de série.
- **Don't** introduza um terceiro matiz ou uma cor de marca.
- **Don't** adicione animação de entrada, pulso ou celebração; o único movimento autoral é o do medidor.
- **Don't** escreva rótulos em caixa alta nem use texto abaixo de 12px.
