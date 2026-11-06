# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Uma única pessoa: o dono do app, que registra o próprio consumo de tabaco e cannabis. O psicólogo não usa o app; recebe a planilha exportada.

## Product Purpose

Ajudar a reduzir o consumo aos poucos. O app conta cada uso do dia, compara com um limite diário e mostra se a tendência está caindo. Parar de vez não é o compromisso atual. Sucesso é o limite baixar ao longo do tempo sem o registro virar um peso.

## Positioning

Diário pessoal de redução, não programa de cessação: um toque registra, o contexto (local e motivo) é opcional e vem depois, e o histórico serve para uma conversa real em terapia.

## Operating Context

Uso meio a meio entre celular e desktop. No iPhone, abre pela Tela de Início e registra em segundos, várias vezes ao dia. No computador, revisa histórico e metas e exporta a planilha. A interface é em pt-BR.

## Capabilities and Constraints

- Registro em um toque de tabaco ou cannabis, com desfazer e detalhes opcionais (local, motivo, data e hora).
- Limite diário combinado (tabaco + cannabis), com histórico de metas por data.
- Sequência de dias na meta, total de dias na meta, tendência semanal, gráfico mensal, calendário e anotações por dia.
- Exportação JSON e XLSX, importação JSON. O XLSX é o material levado ao psicólogo.
- Funciona só local; com Supabase configurado, sincroniza entre aparelhos com login por código no e-mail.
- PWA instalável. A build gera um arquivo HTML único, com CSP.

## Brand Commitments

O nome "Smoking Tracker" fica. Nenhum outro elemento visual é obrigatório.

## Evidence on Hand

Dados reais ficam só no aparelho do usuário. Não existem depoimentos, métricas de uso ou clientes, e nada disso deve ser inventado.

## Product Principles

- Registrar precisa custar um toque, sempre.
- O app informa sem julgar: um dia acima da meta é dado, não fracasso.
- A redução é gradual, então o que importa é a tendência, não o dia isolado.
- Privado por padrão: é um diário de uma pessoa, não uma rede nem um programa.
