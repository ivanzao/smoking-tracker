# Sincronização com Supabase + iPhone — Design

**Data:** 2026-11-05
**Branch:** `feat/supabase-sync`

**Escopo:** deixar o app usável no iPhone pela Tela de Início, com os dados sincronizados entre aparelhos por um banco Supabase protegido por login. Uso pessoal, um único usuário.

**Pré-requisitos:** o app já está no GitHub Pages (`ivanzao.github.io/smoking-tracker`), com manifest e service worker. O estado vive em `localStorage['smoking-tracker']`, gerenciado por `useTracker`.

---

## Decisões

| Tema | Decisão | Por quê |
|---|---|---|
| Hospedagem | Continua no GitHub Pages | O front é estático e fala direto com o Supabase |
| Backend | Supabase, plano gratuito, região São Paulo | Banco e auth sem servidor próprio |
| Modelo | Local primeiro | Registro instantâneo e funcionamento sem sinal |
| Login | Código por e-mail (`signInWithOtp` + `verifyOtp`) | O fluxo não sai do app. OAuth em app da Tela de Início tem relatos de abrir no Safari e não voltar |
| Acesso | Cadastros desligados + RLS por `user_id` | Sem checagem de e-mail fixo: religar cadastros basta para abrir a outra pessoa |
| Criptografia | Sem ponta a ponta | Não compensa gerenciar chaves neste escopo |

## Tabela `records`

Cada evento, meta, nota e o reset de streak é uma linha.

| Coluna | Tipo | Papel |
|---|---|---|
| `user_id` | `uuid` | Dono da linha, base da RLS |
| `kind` | `text` | `event`, `goal`, `note` ou `streak-reset` |
| `id` | `text` | Id do registro. `text` porque backups importados podem ter ids que não são UUID |
| `data` | `jsonb` | Conteúdo do registro |
| `updated_at` | `timestamptz` | Hora da **edição**, definida pelo aparelho. Decide conflitos |
| `deleted_at` | `timestamptz` | Marca de exclusão |
| `synced_at` | `timestamptz` | Hora em que o servidor recebeu a linha, definida por trigger. É o cursor do pull |

Duas colunas de tempo são necessárias: uma edição offline chega atrasada, então `updated_at` não serve de cursor, e `synced_at` não serve para decidir qual edição é mais recente.

Não existe política de `DELETE`: exclusão é sempre marca, para que o registro não volte quando outro aparelho sincronizar.

## Ledger local

`localStorage['smoking-tracker-sync']` guarda o estado da sincronização, sem duplicar os dados:

```ts
interface Ledger {
  cursor: string | null;                 // maior synced_at já visto
  entries: Record<string, LedgerEntry>;  // chave `${kind}:${id}`
}

interface LedgerEntry {
  hash: string;       // hash canônico de data
  updatedAt: string;  // hora da edição
  dirty: boolean;     // falta enviar
  deleted: boolean;   // exclusão ainda não enviada
}
```

- O hash usa JSON com **chaves ordenadas**, porque `jsonb` não preserva a ordem. Sem isso, todo registro vindo do banco pareceria alterado.
- Mudanças locais são detectadas comparando o estado com o ledger **a cada alteração de estado**, não na hora de sincronizar. Assim `updatedAt` guarda a hora real de uma edição offline, e `useTracker` não precisa mudar em cada mutação.
- Exclusão já enviada sai do ledger. Um desfazer logo depois vira um registro novo e limpa `deleted_at` no banco.

## Ao abrir o app

Antes de tudo, o ledger é alinhado com o estado salvo. Nesse momento ninguém editou nada, então qualquer diferença **nunca é ação do usuário**: é primeiro login, armazenamento perdido ou queda do app entre gravar o ledger e gravar o estado.

- Registro sem entrada no ledger, ou com hash diferente, recebe a hora de edição mais antiga possível. Assim o banco vence se tiver esse registro, e ele sobe se o banco não tiver.
- Entrada do ledger sem registro no estado é descartada, **sem virar exclusão**.
- Se houve diferença, o cursor volta ao início e o próximo pull traz tudo de novo.

Isso impede que um celular com cópia antiga sobrescreva dados novos no primeiro login, e que um `localStorage` perdido apague o banco.

## Ciclo de sincronização

1. Registrar mudanças locais no ledger.
2. Pull das linhas com `synced_at` depois do cursor, com folga de 60 s, paginado. Reprocessar uma linha é inofensivo.
3. Reconciliar cada linha:
   - Mesmo hash e mesmo estado de exclusão: nada muda e `dirty` é limpo.
   - Local mais recente: mantém o local e marca `dirty`, mesmo se estava limpo, para o banco convergir.
   - Remoto igual ou mais recente: aplica o remoto.
   - Linha com formato inválido: ignorada, sem quebrar o app.
4. Gravar o ledger **antes** de aplicar no estado, para a aplicação não ser detectada como edição local.
5. Push de tudo que está `dirty`, em lotes de 500.
6. Limpar `dirty` só das entradas que não mudaram durante o push. Uma edição feita no meio do ciclo continua pendente.

Roda ao abrir o app, ao voltar para ele, ao recuperar conexão e 1,5 s depois de uma alteração. Só um ciclo roda por vez; um pedido durante o ciclo gera mais uma rodada no fim.

## Autenticação no app

| Situação | Comportamento |
|---|---|
| Supabase não configurado (sem env) | App funciona só local, como hoje |
| Sem sessão, nunca logou no aparelho | Tela de login bloqueia o app |
| Sem sessão, já logou antes | App funciona, salva local e mostra aviso para entrar de novo |
| Logado | App normal, com sincronização |

"Já logou antes" é a chave `smoking-tracker-account`, com o e-mail. Ela distingue sessão expirada de aparelho novo.

Sair apaga os dados locais do aparelho e recarrega a página. Se houver registros não enviados, pede confirmação antes.

Abas do mesmo navegador compartilham o ledger, então cada aba recarrega o estado quando outra salva. Sem isso, uma aba desatualizada leria como exclusão o que a outra adicionou.

## iPhone

- `apple-touch-icon` em PNG 180×180 e ícones PNG 192 e 512 no manifest, porque o iOS não usa SVG.
- Metatags `apple-mobile-web-app-*`, com barra de status `default`, para o conteúdo não ficar sob a barra.
- Campo do código com `autocomplete="one-time-code"` e teclado numérico.

## Configuração

- Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no build, vindas de variáveis do repositório no GitHub. A chave `anon` é pública por natureza.
- Os templates de e-mail do Supabase precisam usar `{{ .Token }}`, senão chega um link em vez do código.
- Enquanto as variáveis não existirem, o deploy continua funcionando só local.

## Defesas adicionais

- CSP gerada só na build (`vite.config.ts`), porque o servidor de desenvolvimento precisa de scripts inline. O `connect-src` usa a origem de `VITE_SUPABASE_URL`. `style-src` mantém `'unsafe-inline'` porque Sonner e Vaul injetam `<style>` em tempo de execução.
- O pull filtra por `user_id` além da RLS. A RLS continua sendo a proteção real.
- `user_id` fica em texto puro: é um UUID aleatório, sem valor como credencial. Um hash não protegeria `data` e quebraria a chave estrangeira.

## Limitações conhecidas

- O relógio do aparelho decide conflitos. Relógios muito errados podem fazer a edição errada vencer.
- Definir metas diferentes no mesmo dia, em dois aparelhos offline, cria duas metas com a mesma data.
- Registros editados antes do primeiro login não têm hora de edição conhecida: se o banco tiver o mesmo id, o banco vence.
