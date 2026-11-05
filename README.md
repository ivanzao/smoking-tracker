# Smoking Tracker

Um contador simples para monitorar consumo diário de tabaco e cannabis, com contexto de local e motivo.

## Como usar

O projeto é compilado em um único arquivo HTML (`dist/index.html`) que contém tudo o que é necessário para rodar a aplicação.

Você pode abrir o arquivo `dist/index.html` diretamente no seu navegador.

## Build com Docker

Para gerar o arquivo `dist/index.html` usando Docker (sem precisar instalar Node.js na sua máquina), execute:

```bash
docker build --output type=local,dest=dist .
```

Este comando irá criar (ou sobrescrever) a pasta `dist` no diretório atual com a versão mais recente do app.

## Sincronização e iPhone

Sem configuração, o app roda só local. Para sincronizar entre aparelhos:

1. Crie um projeto no [Supabase](https://supabase.com) e rode `supabase/migrations/20261105000000_records.sql` no SQL Editor.
2. Em **Authentication → Emails**, troque o corpo dos templates **Magic Link** e **Confirm signup** para mostrar o código com `{{ .Token }}`.
3. Defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis do repositório no GitHub (**Settings → Secrets and variables → Actions → Variables**). Para rodar localmente, copie `.env.example` para `.env.local`.
4. Faça o primeiro login no app e depois desligue novos cadastros em **Authentication → Sign In / Providers**.

No iPhone, abra o site no Safari e use **Compartilhar → Adicionar à Tela de Início**.

Detalhes em `docs/superpowers/specs/2026-11-05-supabase-sync-iphone-design.md`.

## Desenvolvimento

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm test           # testes em modo watch
npm run test:run   # testes uma única vez
npm run build      # build de produção
```
