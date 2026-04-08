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

## Desenvolvimento

```bash
npm install
npm run dev        # servidor de desenvolvimento
npm test           # testes em modo watch
npm run test:run   # testes uma única vez
npm run build      # build de produção
```
